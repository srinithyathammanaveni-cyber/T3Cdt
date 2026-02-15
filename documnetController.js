import Document from '../models/Document.js';

// Get document by ID, create if doesn't exist
export const getDocument = async (id) => {
    if (id === null) return;
    
    try {
        let document = await Document.findById(id);
        
        if (document) {
            return document;
        }
        
        // Create new document with default content
        return await Document.create({ 
            _id: id, 
            data: {
                ops: [
                    { insert: 'Start collaborating in real-time!\n' }
                ]
            },
            title: 'Untitled Document'
        });
    } catch (error) {
        console.error('Error getting document:', error);
        return null;
    }
};

// Update document data
export const updateDocument = async (id, data) => {
    try {
        const document = await Document.findByIdAndUpdate(
            id, 
            { 
                data, 
                updatedAt: new Date() 
            },
            { new: true }
        );
        return document;
    } catch (error) {
        console.error('Error updating document:', error);
        return null;
    }
};

// Update document title
export const updateDocumentTitle = async (id, title) => {
    try {
        const document = await Document.findByIdAndUpdate(
            id,
            { title, updatedAt: new Date() },
            { new: true }
        );
        return document;
    } catch (error) {
        console.error('Error updating title:', error);
        return null;
    }
};

// Get all documents (for listing)
export const getAllDocuments = async () => {
    try {
        return await Document.find({}).sort({ updatedAt: -1 }).limit(20);
    } catch (error) {
        console.error('Error getting documents:', error);
        return [];
    }
};

// Delete document
export const deleteDocument = async (id) => {
    try {
        await Document.findByIdAndDelete(id);
        return true;
    } catch (error) {
        console.error('Error deleting document:', error);
        return false;
    }
};