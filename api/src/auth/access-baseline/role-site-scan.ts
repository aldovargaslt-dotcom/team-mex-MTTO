import * as fs from 'fs';
import * as path from 'path';

export type RoleSite = { file: string; member: string; code: string };

const SKIP_FILE =
  /(\.spec\.ts|\.controller\.ts|roles\.enum\.ts|roles\.decorator\.ts)$|^auth\/permissions\.ts$/;
const SKIP_DIR = /(^|\/)(access-baseline)(\/|$)/;
const MEMBER =
  /^ {2}(?:(?:private|public|protected|static|async|readonly)\s+)*([A-Za-z_$][\w$]*)\s*[(<]/;
const FUNC = /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/;
const SITE = /\bRol\.[A-Z_]+|\.rol\b|\.roles\b|\bauthorize\(/;

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.ts')) out.push(p);
  }
  return out;
}

/** Inventario textual de lugares donde el código inspecciona roles fuera de
 *  `@Roles(...)`: (archivo, miembro envolvente, línea normalizada). Sin números
 *  de línea para que reformatear no rompa la línea base. */
export function scanRoleSites(srcDir: string): RoleSite[] {
  const sites: RoleSite[] = [];
  for (const file of walk(srcDir).sort()) {
    const rel = path.relative(srcDir, file).split(path.sep).join('/');
    if (SKIP_FILE.test(rel) || SKIP_DIR.test(rel)) continue;
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    let member = '<module>';
    for (const line of lines) {
      const m = MEMBER.exec(line) ?? FUNC.exec(line);
      if (m) member = m[1];
      if (
        SITE.test(line) &&
        !line.trim().startsWith('//') &&
        !line.trim().startsWith('import ')
      ) {
        sites.push({
          file: rel,
          member,
          code: line.trim().replace(/\s+/g, ' '),
        });
      }
    }
  }
  return sites.sort((a, b) =>
    (a.file + a.member + a.code).localeCompare(b.file + b.member + b.code),
  );
}
