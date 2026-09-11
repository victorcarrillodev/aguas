CREATE TABLE usuarios (
  usuario text PRIMARY KEY CHECK (usuario ~ '^[A-Za-z0-9._-]{1,64}$'),
  correo text NOT NULL CHECK (position('@' in correo) > 1),
  clave text NOT NULL CHECK (clave LIKE 'scrypt.%'),
  rol text NOT NULL CHECK (rol IN ('root', 'investigador')),
  activo boolean NOT NULL DEFAULT true,
  creado_por text,
  creado_en timestamptz NOT NULL DEFAULT now(),
  clave_actualizada_en timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX usuarios_correo ON usuarios (lower(correo));
