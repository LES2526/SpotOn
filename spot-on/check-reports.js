const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const reports = await prisma.report.findMany();
    console.log(reports);
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
