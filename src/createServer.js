'use strict';

/* eslint-disable no-console */

const { createReadStream, createWriteStream } = require('fs');
const http = require('http');
const path = require('path');

function createServer() {
  const server = new http.Server();

  function getHandler(req, res) {
    if (req.method !== 'GET') {
      return;
    }

    if (req.url !== '/' && req.url !== '') {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Not Found');

      return;
    }

    const form = createReadStream(path.join(__dirname, 'index.html'));

    res.on('close', () => {
      form.destroy();
    });

    form.pipe(res);
  }

  function postHandler(req, res) {
    if (req.method !== 'POST') {
      return;
    }

    if (req.url !== '/add-expense') {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Not Found');

      return;
    }

    const file = path.resolve('db', 'expense.json');

    let raw = '';

    req.setEncoding('utf8');

    req.on('data', (chunk) => {
      raw += chunk;
    });

    req.on('end', () => {
      let payload;

      try {
        payload = raw ? JSON.parse(raw) : {};
      } catch (parseErr) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Bad Request');

        return;
      }

      const expense = {
        date: payload.date,
        title: payload.title,
        amount: payload.amount,
      };

      if (!expense.date || !expense.title || !expense.amount) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Missing required fields');

        return;
      }

      const writer = createWriteStream(file);

      writer.on('error', (error) => {
        console.error('Write stream error:', error);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Internal Server Error');
      });

      writer.end(JSON.stringify(expense), () => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(expense));
      });
    });

    req.on('error', (err) => {
      console.error('Request error:', err);
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Bad Request');
    });
  }

  server.on('request', getHandler);
  server.on('request', postHandler);

  server.on('request', (req, res) => {
    if (req.method !== 'GET' && req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Method Not Allowed');
    }
  });

  server.on('error', () => {});

  return server;
}

module.exports = {
  createServer,
};
