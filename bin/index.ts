#!/usr/bin/env node
import { join } from 'node:path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { build } from '../lib/build.js';

const cliArgs = await yargs(hideBin(process.argv))
  .usage('Usage: $0 -i [string] -o [string]')
  .demandOption(['i', 'o'])
  .command('$0', '', (y) => {
    y.option('output-dir', {
      alias: 'o',
      type: 'string',
      description: 'Output dir',
    })
      .option('input-file', {
        alias: 'i',
        type: 'string',
        description: 'OpenAPI schema input file',
      })
      .option('tags', {
        alias: 't',
        type: 'array',
        description: 'tags',
        coerce(arg: string[] | string): string[] {
          return Array.isArray(arg) ? arg : [arg];
        },
      });
  })
  .help().argv;

await build(
  join(process.cwd(), String(cliArgs.i)),
  join(process.cwd(), String(cliArgs.o)),
  cliArgs['t'] as Array<string>,
);
