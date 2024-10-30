import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import type { SyncOrdersTask } from '@prisma/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const downloadResult = async (task: SyncOrdersTask) => {
  await prisma.syncOrdersTask.update({
    where: { id: task.id },
    data: { inProgress: true, updatedAt: new Date() },
  });

  const taskData = task.data ? JSON.parse(task.data as string) : {}
  console.log("\n\n\n", "taskData-------------downloadResult", "\n\n\n", taskData)
  const url = taskData.data.node.url
  const id = taskData.data.node.id

  if (!url) {
    await prisma.syncOrdersTask.update({
      where: { id: task.id },
      data: {
        inProgress: false,
        error: 'URL not found',
        updatedAt: new Date(),
      },
    });
    return;
  }

  try {
    const directoryPath = path.join(__dirname, '../data');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(directoryPath, `orders_${task.id}_${timestamp}.jsonl`);

    console.log("Directory Path:", directoryPath);
    console.log("File Path:", filePath);

    // Создание папки, если её нет
    fs.mkdirSync(directoryPath, { recursive: true });

    // Загрузка файла
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
    });

    if (!response || response.status !== 200) {
      console.error(`Ошибка при загрузке файла: статус ${response.status}`);
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    // Создание потока записи в файл
    const writer = fs.createWriteStream(filePath);

    response.data.pipe(writer);

    // Ожидание завершения записи
    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    await prisma.syncOrdersTask.update({
      where: { id: task.id },
      data: {
        data: JSON.stringify(filePath),
        stage: 'PROCESS_RESULT',
        inProgress: false,
        updatedAt: new Date(),
      },
    });

    console.log(`File downloaded and saved to ${filePath}`);
  } catch (error) {
    console.error('Error downloading file:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await prisma.syncOrdersTask.update({
      where: { id: task.id },
      data: {
        inProgress: false,
        error: errorMessage,
        updatedAt: new Date(),
      },
    });
  }
};
