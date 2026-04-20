import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const databasePath =
  process.env.DATABASE_PATH ??
  path.join(process.cwd(), "data", "child-tracking.sqlite");

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const db = new Database(databasePath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS children (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    birth_date TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS measurements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id INTEGER NOT NULL,
    measured_at TEXT NOT NULL,
    weight REAL,
    height REAL,
    temperature REAL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_measurements_child_id ON measurements(child_id);
  CREATE INDEX IF NOT EXISTS idx_measurements_measured_at ON measurements(measured_at);
`);

type ChildRow = {
  id: number;
  name: string;
  birth_date: string | null;
  created_at: string;
  updated_at: string;
};

type MeasurementRow = {
  id: number;
  child_id: number;
  measured_at: string;
  weight: number | null;
  height: number | null;
  temperature: number | null;
  created_at: string;
  updated_at: string;
};

export type Child = {
  id: number;
  name: string;
  birthDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Measurement = {
  id: number;
  childId: number;
  measuredAt: string;
  weight: number | null;
  height: number | null;
  temperature: number | null;
  createdAt: string;
  updatedAt: string;
};

function mapChild(row: ChildRow): Child {
  return {
    id: row.id,
    name: row.name,
    birthDate: row.birth_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMeasurement(row: MeasurementRow): Measurement {
  return {
    id: row.id,
    childId: row.child_id,
    measuredAt: row.measured_at,
    weight: row.weight,
    height: row.height,
    temperature: row.temperature,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const childSelect = `
  SELECT id, name, birth_date, created_at, updated_at
  FROM children
`;

const measurementSelect = `
  SELECT id, child_id, measured_at, weight, height, temperature, created_at, updated_at
  FROM measurements
`;

export function getChildren() {
  return (
    db
    .prepare(`${childSelect} ORDER BY name COLLATE NOCASE ASC`)
    .all() as ChildRow[]
  ).map(mapChild);
}

export function getMeasurementsByChild(childId: number) {
  return (
    db
    .prepare(`${measurementSelect} WHERE child_id = ? ORDER BY measured_at DESC`)
    .all(childId) as MeasurementRow[]
  ).map(mapMeasurement);
}

export function createChild(input: { name: string; birthDate: string | null }) {
  const statement = db.prepare(`
    INSERT INTO children (name, birth_date, created_at, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);
  const result = statement.run(input.name, input.birthDate);

  return getChildById(Number(result.lastInsertRowid));
}

export function updateChild(
  id: number,
  input: { name: string; birthDate: string | null },
) {
  db.prepare(`
    UPDATE children
    SET name = ?, birth_date = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(input.name, input.birthDate, id);

  return getChildById(id);
}

export function deleteChild(id: number) {
  db.prepare(`DELETE FROM children WHERE id = ?`).run(id);
}

export function getChildById(id: number) {
  const row = db
    .prepare(`${childSelect} WHERE id = ?`)
    .get(id) as ChildRow | undefined;

  return row ? mapChild(row) : null;
}

export function createMeasurement(input: {
  childId: number;
  measuredAt: string;
  weight: number | null;
  height: number | null;
  temperature: number | null;
}) {
  const statement = db.prepare(`
    INSERT INTO measurements (
      child_id,
      measured_at,
      weight,
      height,
      temperature,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);
  const result = statement.run(
    input.childId,
    input.measuredAt,
    input.weight,
    input.height,
    input.temperature,
  );

  return getMeasurementById(Number(result.lastInsertRowid));
}

export function updateMeasurement(
  id: number,
  input: {
    measuredAt: string;
    weight: number | null;
    height: number | null;
    temperature: number | null;
  },
) {
  db.prepare(`
    UPDATE measurements
    SET measured_at = ?, weight = ?, height = ?, temperature = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    input.measuredAt,
    input.weight,
    input.height,
    input.temperature,
    id,
  );

  return getMeasurementById(id);
}

export function deleteMeasurement(id: number) {
  db.prepare(`DELETE FROM measurements WHERE id = ?`).run(id);
}

function getMeasurementById(id: number) {
  const row = db
    .prepare(`${measurementSelect} WHERE id = ?`)
    .get(id) as MeasurementRow | undefined;

  return row ? mapMeasurement(row) : null;
}

export function getInitialAppState() {
  const children = getChildren();
  const measurementsByChild = Object.fromEntries(
    children.map((child) => [
      child.id,
      getMeasurementsByChild(child.id),
    ]),
  );

  return { children, measurementsByChild };
}
