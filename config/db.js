const mongoose = require('mongoose');
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`Database connection established: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error in DB connection: ${error.message}`);
        process.exit(1); // Exit with failure
    }
}

module.exports = { connectDB };