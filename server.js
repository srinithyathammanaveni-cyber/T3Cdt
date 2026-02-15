import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import Connection from './database/db.js';
import { 
    getDocument, 
    updateDocument, 
    updateDocumentTitle,
    getAllDocuments,
    deleteDocument 
} from './controllers/documentController.js';

dotenv.config();

// Initialize Express
const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
Connection();

// REST API Routes
app.get('/api/documents', async (req, res) => {
    const documents = await getAllDocuments();
    res.json(documents);
});

app.get('/api/documents/:id', async (req, res) => {
    const document = await getDocument(req.params.id);
    if (document) {
        res.json(document);
    } else {
        res.status(404).json({ error: 'Document not found' });
    }
});

app.delete('/api/documents/:id', async (req, res) => {
    const result = await deleteDocument(req.params.id);
    if (result) {
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Document not found' });
    }
});

// Socket.IO for real-time collaboration
io.on('connection', (socket) => {
    console.log('🔗 New client connected:', socket.id);

    // User joins a document room
    socket.on('get-document', async (documentId) => {
        try {
            const document = await getDocument(documentId);
            
            if (document) {
                // Join room for this document
                socket.join(documentId);
                
                // Load document to user
                socket.emit('load-document', {
                    data: document.data,
                    title: document.title,
                    id: document._id
                });
                
                // Notify others in room
                socket.to(documentId).emit('user-joined', {
                    userId: socket.id,
                    timestamp: new Date().toISOString()
                });
                
                console.log(`📄 User ${socket.id} loaded document: ${documentId}`);
            }
        } catch (error) {
            console.error('Error loading document:', error);
            socket.emit('error', 'Failed to load document');
        }
    });

    // Handle document changes
    socket.on('send-changes', (delta, documentId) => {
        // Broadcast changes to all OTHER clients in the room
        socket.to(documentId).emit('receive-changes', delta);
    });

    // Save document to database
    socket.on('save-document', async (data, documentId) => {
        try {
            await updateDocument(documentId, data);
            socket.to(documentId).emit('document-saved', {
                savedBy: socket.id,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error saving document:', error);
        }
    });

    // Update document title
    socket.on('update-title', async (title, documentId) => {
        try {
            await updateDocumentTitle(documentId, title);
            io.to(documentId).emit('title-updated', {
                title,
                updatedBy: socket.id,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error updating title:', error);
        }
    });

    // Request cursor position (for showing who's editing where)
    socket.on('cursor-position', (position, documentId) => {
        socket.to(documentId).emit('cursor-update', {
            userId: socket.id,
            position
        });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('❌ Client disconnected:', socket.id);
        
        // Notify all rooms this user was in
        socket.rooms.forEach(room => {
            if (room !== socket.id) {
                socket.to(room).emit('user-left', {
                    userId: socket.id,
                    timestamp: new Date().toISOString()
                });
            }
        });
    });
});

// Start server
const PORT = process.env.PORT || 9000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}`);
    console.log(`🗄️  Database: ${process.env.MONGODB_URI}`);
});