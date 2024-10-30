export async function insertIntoDatabase(dataArr) {
  try {
    for (const order of dataArr) {
      await prisma.order.upsert({
        where: {
          id: order.id,
        },
        update: {

        },
        create: {
          id: order.id,
          email: order.email,
          firstName: order.customer.firstName,
        },
      })
    }
  } catch (err) {
    console.error('Ошибка при вставке данных:', err);
  }
}
