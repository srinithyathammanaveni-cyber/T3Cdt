import mongoose from 'mongoose';

const documentSchema = mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    title: {
        type: String,
        default: 'Untitled Document'
    },
    data: {
        type: Object,
        required: true,
        default: {
            ops: [
                { insert: 'Welcome to Collaborative Editor!\n' }
            ]
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: String,
        default: 'Anonymous'
    },
    collaborators: {
        type: Array,
        default: []
    }
});

const Document = mongoose.model('Document', documentSchema);
export default Document;