const http = require('http');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const url = require('url');

const PORT = 3000;

// Database connection settings
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'rootroot',
    database: 'todolist',
};

// Function to retrieve all list items
async function retrieveListItems() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const query = 'SELECT id, text FROM items ORDER BY id';
        const [rows] = await connection.execute(query);
        await connection.end();
        return rows;
    } catch (error) {
        console.error('Error retrieving list items:', error);
        throw error;
    }
}

// Function to add a new item
async function addListItem(text) {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const query = 'INSERT INTO items (text) VALUES (?)';
        const [result] = await connection.execute(query, [text]);
        await connection.end();
        return { id: result.insertId, text };
    } catch (error) {
        console.error('Error adding list item:', error);
        throw error;
    }
}

// Function to delete an item
async function deleteListItem(id) {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const query = 'DELETE FROM items WHERE id = ?';
        const [result] = await connection.execute(query, [id]);
        await connection.end();
        return result.affectedRows > 0;
    } catch (error) {
        console.error('Error deleting list item:', error);
        throw error;
    }
}

// Function to edit an item
async function editListItem(id, text) {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const query = 'UPDATE items SET text = ? WHERE id = ?';
        const [result] = await connection.execute(query, [text, id]);
        await connection.end();
        return result.affectedRows > 0;
    } catch (error) {
        console.error('Error editing list item:', error);
        throw error;
    }
}

// Generate HTML rows with sequential numbering
async function getHtmlRows() {
    const todoItems = await retrieveListItems();
    return todoItems.map((item, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${item.text}</td>
            <td>
                <button class="edit-btn" data-id="${item.id}">Edit</button>
                <button class="delete-btn" data-id="${item.id}">×</button>
            </td>
        </tr>
    `).join('');
}

// Request handler
async function handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    if (req.method === 'GET' && pathname === '/') {
        try {
            const html = await fs.promises.readFile(
                path.join(__dirname, 'index.html'), 
                'utf8'
            );
            const processedHtml = html.replace('{{rows}}', await getHtmlRows());
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(processedHtml);
        } catch (err) {
            console.error(err);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error loading index.html');
        }
    } else if (req.method === 'POST' && pathname === '/add') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { text } = JSON.parse(body);
                if (!text) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Text is required' }));
                    return;
                }
                const newItem = await addListItem(text);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(newItem));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to add item' }));
            }
        });
    } else if (req.method === 'POST' && pathname === '/delete') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { id } = JSON.parse(body);
                const success = await deleteListItem(id);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to delete item' }));
            }
        });
    } else if (req.method === 'POST' && pathname === '/edit') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { id, text } = JSON.parse(body);
                if (!text || !id) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'ID and text are required' }));
                    return;
                }
                const success = await editListItem(id, text);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to edit item' }));
            }
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Route not found');
    }
}

// Create and start server
const server = http.createServer(handleRequest);
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));