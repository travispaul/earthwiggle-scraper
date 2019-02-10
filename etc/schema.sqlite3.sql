CREATE TABLE earthquake (
  id integer PRIMARY KEY AUTOINCREMENT,
  event varchar NOT NULL,
  latitude varchar,
  longitude varchar,
  depth varchar,
  magnitude varchar,
  location varchar,
  link varchar,
  img varchar,
  created timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_earthquake_time ON earthquake (event);

CREATE TABLE tsunami (
  id integer PRIMARY KEY AUTOINCREMENT,
  event varchar NOT NULL,
  latitude varchar,
  longitude varchar,
  depth varchar,
  magnitude varchar,
  location varchar,
  link varchar,
  created timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_tsunami_time ON tsunami (event);