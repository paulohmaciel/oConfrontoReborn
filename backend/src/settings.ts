import { Prisma, PrismaClient } from '@prisma/client';
import { defaultSettings, validSetting, settingKeys, type SettingKey, type Settings } from '../../shared/economy';
type Db = Prisma.TransactionClient | PrismaClient;
// Valores inválidos gravados por engano no banco são ignorados e o padrão é usado.
export async function loadSettings(db: Db): Promise<Settings> {
  const settings = defaultSettings();
  const rows = await db.gameSetting.findMany();
  for (const row of rows) if (validSetting(row.key, row.value)) settings[row.key as SettingKey] = row.value;
  return settings;
}
export async function saveSettings(tx: Prisma.TransactionClient, actorId: number, changes: Partial<Record<SettingKey, number>>) {
  const applied: Partial<Record<SettingKey, number>> = {};
  for (const key of settingKeys) {
    const value = changes[key];
    if (value === undefined) continue;
    await tx.gameSetting.upsert({ where: { key }, update: { value, updatedById: actorId }, create: { key, value, updatedById: actorId } });
    applied[key] = value;
  }
  return applied;
}
