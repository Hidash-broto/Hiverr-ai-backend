import mongoose from 'mongoose';

export const connectDb = () => {
    mongoose.connect(process.env.MONGO_CONNECTION_URL).then(() => console.log('Database connected'));
}