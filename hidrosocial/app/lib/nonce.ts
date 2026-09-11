// Nonce de la Content-Security-Policy. El servidor genera uno por respuesta y
// lo publica por contexto; `root` lo pone en los <script> que emite Remix.
// En el navegador el contexto queda vacío: el atributo ya viajó en el HTML.

import { createContext, useContext } from 'react';

export const ContextoNonce = createContext<string>('');

export function useNonce(): string {
  return useContext(ContextoNonce);
}
