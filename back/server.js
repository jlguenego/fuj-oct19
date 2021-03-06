const express = require('express');
const serveIndex = require('serve-index');
const cors = require('cors');
const fs = require('fs').promises;
const mongoose = require('mongoose');
const http = require('http');
const WebSocket = require('ws');

const Reference = require('./model/Reference');

const sleep = delay => new Promise(resolve => setTimeout(resolve, delay));

mongoose.set('useCreateIndex', true);
mongoose.connect('mongodb://localhost:27017/lavalstore', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB ok.'));


const app = express();
const port = 3000;

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

app.use(async (req, res, next) => {
    await sleep(2000);
    next();
});

app.get('/ws/reference', async (req, res, next) => {
    try {
        const references = await Reference.find();
        res.json(references.map(d => d.toObject()));
    } catch (err) {
        res.status(500).end();
    }
});

app.post('/ws/reference', async (req, res, next) => {
    try {
        const ref = new Reference(req.body);
        await ref.save();
        res.status(204).end();
        notify();
    } catch (err) {
        res.status(400).json(err);
    }
});

app.put('/ws/reference/:id', async (req, res, next) => {
    try {
        const id = mongoose.Types.ObjectId(req.params.id);

        let resource = await Reference.findById(id);
        if (resource === null) {
            res.status(404).json({ error: 'Object not found' });
            return;
        }
        await resource.update(req.body, {
            overwrite: true
        });
        res.status(204).end();
        notify();
    } catch (err) {
        res.status(400).json(err);
    }
});

app.use(express.static('.'));
app.use(serveIndex('.', { icons: true }));




wss.on('connection', async (ws) => {
    console.log('new ws connection');

    //connection is up, let's add a simple simple event
    ws.on('message', message => {

        //log the received message and send it back to the client
        console.log('received: %s', message);
        ws.send(`Hello, you sent -> ${message}`);


    });

    //send immediatly a feedback to the incoming connection    
    ws.send('hello');
    await sleep(5000);
    ws.send('comment allez vous ?');

});

server.listen(port, () => {
    console.log(`Server started on port ${server.address().port} :)`);
});

function notify() {
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send('refresh requested...');
        }
    });
}
