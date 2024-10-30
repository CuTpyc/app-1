import {$Enums, type SyncOrdersTask} from '@prisma/client';
import { readJsonlFile } from './helpers/processOrders';

export const processResult = async (task: SyncOrdersTask) => {
  await prisma.syncOrdersTask.update({
    where: {
      id: task.id
    },
    data: {
      retryCount: {
        increment: 1
      },
      inProgress: true,
      updatedAt: new Date()
    }
  });
  console.log('\n\n\n', "prisma.syncOrdersTask-----processResult", "\n\n\n")
  const shop = await prisma.shop.findFirst({
    where: {
      id: task.shopId
    }
  });
  console.log('\n\n\n', "await prisma.shop.findFirst-----processResult", "\n\n\n")
  if (!shop) {
    await prisma.syncOrdersTask.update({
      where: {
        id: task.id
      },
      data: {
        retryCount: {
          increment: 1
        },
        inProgress: false,
        updatedAt: new Date(),
        error: 'Shop not found'
      }
    });
    return;
  }
// Header of Task

const taskFilePath = task.data ? JSON.parse(task.data as string) : {}

const jsonOrdersArray = readJsonlFile(taskFilePath)
.then((data) => console.log('Полученные JSON данные:', data))
.catch((error) => console.error('Ошибка при чтении файла:', error));

console.log('\n\n\n', "orderArrey-----processResult", "\n\n\n", jsonOrdersArray, "\n\n\n")

async function processData(dataArr: any[]) {
  for (const item of dataArr) {
    if (item.id.startsWith('gid://shopify/Order')) {
      await upsertOrder(item);
    } else if (item.id.startsWith('gid://shopify/Return')) {
      await upsertReturn(item);
    }
  }
}

async function upsertOrder(order: any) {
  // Вставка или обновление данных покупателя
  await prisma.customer.upsert({
    where: { shopifyId: order.customer.shopifyId },
    update: {
      email: order.customer.email,
      firstName: order.customer.firstName,
      lastName: order.customer.lastName,
    },
    create: {
      shopifyId: order.customer.id,
      email: order.customer.email,
      firstName: order.customer.firstName,
      lastName: order.customer.lastName,
      shopId: task.shopId, // Укажите ID магазина, если он фиксирован, или передавайте его в `order`
    },
  });

  // Вставка или обновление заказа
  await prisma.order.upsert({
    where: { shopifyId: order.shopifyId },
    update: {
      customerId: parseInt(order.customer.id.split('/').pop()), // Извлекаем числовой ID
      email: order.customer.email,
      totalPrice: parseFloat(order.totalPriceSet.shopMoney.amount), // Преобразуем сумму в число
      createdAt: new Date(), // Замените на фактическую дату, если доступна
      shopId: task.shopId, // Укажите shopId
    },
    create: {
      shopifyId: order.shopifyId,
      customerId: parseInt(order.customer.id.split('/').pop()),
      email: order.customer.email,
      totalPrice: parseFloat(order.totalPriceSet.shopMoney.amount),
      createdAt: new Date(),
      shopId: task.shopId,
    },
  });
}

async function upsertReturn(returnItem: any) {
  // Находим заказ по `__parentId`
  const parentOrderId = returnItem.__parentId.split('/').pop();
  const order = await prisma.order.findUnique({
    where: { shopifyId: `gid://shopify/Order/${parentOrderId}` },
  });

  if (order) {
    // Вставляем возврат
    await prisma.return.upsert({
      where: { id: parseInt(returnItem.id.split('/').pop()) },
      update: {
        orderId: order.id,
        shopId: order.shopId,
        email: order.email,
        returnDate: new Date(), // Дата возврата, если доступна
        // product: 'Product Name', // Название продукта, замените на реальное значение
        // reason: 'Reason for return', // Причина возврата, замените на реальное значение
        // quantity: 1, // Количество, замените на реальное значение
        // cost: 0, // Стоимость возврата, замените на реальное значение
        customerId: order.customerId,
      },
      create: {
        id: parseInt(returnItem.id.split('/').pop()),
        orderId: order.id,
        shopId: order.shopId,
        email: order.email,
        returnDate: new Date(),
        product: 'Product Name',
        reason: 'Reason for return',
        quantity: 1,
        cost: 0,
        customerId: order.customerId,
      },
    });
  } else {
    console.error('Order not found for return:', returnItem.__parentId);
  }
}

(async () => {
  await processData(jsonOrdersArray);
})();

await prisma.syncOrdersTask.update({
  where: {
    id: task.id
  },
  data: {
    retryCount: {
      increment: 1
    },
    inProgress: false,
    stage: $Enums.SyncOrdersTaskStage.FINISH,
    updatedAt: new Date(),
    data: JSON.stringify(body)
  }
});
};


