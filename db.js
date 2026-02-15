import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const Connection = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Database connected successfully');
    } catch (error) {
        console.log('❌ Error while connecting with database: ', error.message);
    }
};

export default Connection;