import * as fs from 'fs';
import * as readline from 'readline';

export async function readJsonlFile(filePath: string): Promise<any[]> {
  const jsonArray: any[] = []; // Массив для хранения объектов JSON

  const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity, // Разделитель для новых строк
  });

  for await (const line of rl) {
    try {
      const jsonData = JSON.parse(line);
      jsonArray.push(jsonData); // Добавляем каждый JSON объект в массив
    } catch (error) {
      console.error('Ошибка при разборе строки JSON:', error);
    }
  }

  return jsonArray; // Возвращаем массив JSON-объектов
}
