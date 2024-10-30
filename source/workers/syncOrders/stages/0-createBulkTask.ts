import type {SyncOrdersTask} from '@prisma/client';
import {$Enums} from '@prisma/client';
import {unauthenticated} from '../../../app/shopify.server';


export const createBulkTask = async (task: SyncOrdersTask) => {
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
  console.log('\n\n\n', "prisma.syncOrdersTask", "\n\n\n")
  const shop = await prisma.shop.findFirst({
    where: {
      id: task.shopId
    }
  });
  console.log('\n\n\n', "await prisma.shop.findFirst", "\n\n\n")
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

  const {admin: {graphql}} = await unauthenticated.admin(shop.domain);
  console.log('\n\n\n', "unauthenticated.admin", "\n\n\n")
  const query = `
   {
      orders(first: 250) {
        edges {
          node {
            id
            customer {
              id
              email
              firstName
              lastName
            }
            totalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            refunds {
                id
                totalRefundedSet {
                 shopMoney {
              amount
              currencyCode
            }
          }
              }
            returns (first: 250) {
              edges{
                node {
                  id
                }
              }
            }
          }
        }
      }
    }
  `;

  const mutation = `
    mutation {
      bulkOperationRunQuery(query: """${query}""") {
        bulkOperation {
          id
          status
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const result = await graphql(mutation);
  console.log('\n\n\n', "result = await graphql(mutation)", "\n", result, "\n\n\n")
  const body = await result.json();
  console.log('\n\n\n', "body = await result.json()", "\n", body, "\n\n\n")
  if (result.ok) {
    await prisma.syncOrdersTask.update({
      where: {
        id: task.id
      },
      data: {
        stage: $Enums.SyncOrdersTaskStage.WAIT_FOR_FINISH,
        inProgress: false,
        updatedAt: new Date(),
        data: JSON.stringify(body.data)
      }
    });
    return;
  }

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
