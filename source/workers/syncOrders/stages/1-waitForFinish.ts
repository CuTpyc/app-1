import {$Enums, type SyncOrdersTask} from '@prisma/client';
import { unauthenticated } from 'app/shopify.server';

export const waitForFinish = async (task: SyncOrdersTask) => {
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
  console.log('\n\n\n', "prisma.syncOrdersTask-----waitForFinish", "\n\n\n")
  const shop = await prisma.shop.findFirst({
    where: {
      id: task.shopId
    }
  });
  console.log('\n\n\n', "await prisma.shop.findFirst-----waitForFinish", "\n\n\n")
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
  console.log('\n\n\n', "await prisma.syncOrdersTask.update-----waitForFinish","\n\n\n")
  const {admin: {graphql}} = await unauthenticated.admin(shop.domain);

  const taskData = task.data ? JSON.parse(task.data as string) : {}
  const dataId = taskData.bulkOperationRunQuery.bulkOperation.id

  const query = `
    {
      node(id: "${dataId}") {
        ... on BulkOperation {
          id
          status
          errorCode
          createdAt
          completedAt
          objectCount
          fileSize
          url
        }
      }
    }
  `
  console.log('\n\n\n', "query-----waitForFinish", "\n\n\n")
  const result = await graphql(query);
  const body = await result.json();
  const operationStatus = body.data.node.status
  console.log('\n\n\n', "result-----waitForFinish", "\n\n\n")

  if (operationStatus === "COMPLETED") {
    await prisma.syncOrdersTask.update({
      where: {
        id: task.id
      },
      data: {
        stage: $Enums.SyncOrdersTaskStage.DOWNLOAD_RESULT,
        inProgress: false,
        updatedAt: new Date(),
        data: JSON.stringify(body)
      }
    })
  }

  console.log('\n\n\n', "COMPLETED-----waitForFinish", "\n\n\n")
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
      error: JSON.stringify(body)
    }
  });
};
