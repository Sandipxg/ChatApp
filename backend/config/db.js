import dns from 'dns';
import mongoose from 'mongoose';

function configureDnsServers() {
    if (!process.env.MONGODB_DNS_SERVERS) {
        return;
    }

    const servers = process.env.MONGODB_DNS_SERVERS
        .split(',')
        .map((server) => server.trim())
        .filter(Boolean);

    if (servers.length > 0) {
        dns.setServers(servers);
    }
}

async function connectDb(){
    if(!process.env.MONGODB_URI){
        throw new Error('MONGODB_URI is not defined in environment variables');
    }

    configureDnsServers();
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Connected to MongoDB');
}

export default connectDb;
