CREATE TABLE documentos (
  id text PRIMARY KEY,
  metadatos jsonb NOT NULL CHECK (jsonb_typeof(metadatos) = 'object'),
  cuerpo text NOT NULL,
  origen text NOT NULL CHECK (origen IN ('app', 'vault')),
  original_md text,
  hash_origen text,
  creado_en timestamptz NOT NULL DEFAULT now(),
  CHECK (id LIKE '9 · Evidencia de campo/%'),
  CHECK ((origen = 'vault' AND original_md IS NOT NULL AND hash_origen IS NOT NULL)
      OR (origen = 'app' AND original_md IS NULL AND hash_origen IS NULL))
);
CREATE INDEX documentos_objetivo ON documentos ((metadatos->>'nodo_id'));
CREATE INDEX documentos_tipo ON documentos ((metadatos->>'registro'));
CREATE TABLE borradores (
  token uuid PRIMARY KEY,
  datos jsonb NOT NULL CHECK (jsonb_typeof(datos) = 'object'),
  version integer NOT NULL CHECK (version > 0),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE envios_captura (
  token uuid PRIMARY KEY,
  documento_id text NOT NULL REFERENCES documentos(id),
  creado_en timestamptz NOT NULL DEFAULT now()
);
