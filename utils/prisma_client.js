const { PrismaClient } = require("@prisma/client");

// Create the Prisma client instance
const prismaClientSingleton = () => {
    return new PrismaClient();
};

// Set the global prisma client if it doesn't exist already
if (!global.prisma) {
    global.prisma = prismaClientSingleton();
}

// Use the global prisma client throughout your app
const prisma = global.prisma;

module.exports = prisma;

// Only store in global if not in production
if (process.env.NODE_ENV !== "production") {
    global.prisma = prisma;
}