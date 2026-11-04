const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const models = await prisma.vehicleModel.findMany({
    select: { id: true, brand: true, modelName: true, defaultPrice: true, imageUrl: true }
  });
  console.log('Current models:', models);

  for (const m of models) {
    let newPrice = m.defaultPrice;
    if (newPrice < 100000) {
      newPrice = newPrice * 10;
    }
    let newDown = m.minDownPayment ? (m.minDownPayment < 20000 ? m.minDownPayment * 10 : m.minDownPayment) : Math.round(newPrice * 0.1);
    
    let img = m.imageUrl;
    if (!img) {
      if (m.brand.toLowerCase().includes('volt') || m.modelName.toLowerCase().includes('apex')) {
        img = 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80';
      } else if (m.brand.toLowerCase().includes('eco') || m.modelName.toLowerCase().includes('terra')) {
        img = 'https://images.unsplash.com/photo-1571068316344-75bc76f77890?auto=format&fit=crop&w=800&q=80';
      } else if (m.brand.toLowerCase().includes('hyper') || m.modelName.toLowerCase().includes('pulse')) {
        img = 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80';
      } else {
        img = 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=800&q=80';
      }
    }

    await prisma.vehicleModel.update({
      where: { id: m.id },
      data: {
        defaultPrice: newPrice,
        minDownPayment: newDown,
        imageUrl: img,
      }
    });
  }

  const vehicles = await prisma.vehicle.findMany({ select: { id: true, purchasePrice: true } });
  for (const v of vehicles) {
    if (v.purchasePrice < 100000) {
      await prisma.vehicle.update({
        where: { id: v.id },
        data: { purchasePrice: v.purchasePrice * 10 }
      });
    }
  }

  console.log('Successfully updated models and vehicles to realistic LKR!');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
