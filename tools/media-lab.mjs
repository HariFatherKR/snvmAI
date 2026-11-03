import { existsSync } from 'node:fs';
import { mkdir, writeFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import { models, runGeneration, renderReport } from '../lib/media-lab.mjs';

const help = `SNVM 이미지·영상 API 테스트 (Node.js 22.16+)
  npm run lab -- list
  npm run lab -- image [--prompt "제품 사진"] [--execute]
  npm run lab -- video [--prompt "제품이 천천히 회전한다"] [--execute]
  npm run lab -- resume image|video --task 작업ID [--execute]

기본은 dry-run입니다. --execute는 실제 API를 호출합니다.
.env.local의 TOKENHUB_API_KEY를 사용합니다. 문서: docs/media-lab.md`;

async function main() {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    prompt: { type: 'string' }, task: { type: 'string' }, execute: { type: 'boolean', default: false }, help: { type: 'boolean', short: 'h' }
  } });
  if (values.help || !positionals.length) { console.log(help); return; }
  const [command, resumeKind] = positionals;
  if (command === 'list' && positionals.length === 1 && !values.execute && !values.task && !values.prompt) {
    console.table(Object.entries(models).map(([type, spec]) => ({ type, model: spec.model })));
    console.log('문서 기준 연결 대상입니다. 계정별 사용 권한은 실제 호출 전 콘솔에서 확인하세요.');
    return;
  }
  const isResume = command === 'resume';
  const kind = isResume ? resumeKind : command;
  if (!Object.hasOwn(models, kind) || positionals.length !== (isResume ? 2 : 1) || (isResume ? !values.task || values.prompt !== undefined : values.task !== undefined)) throw new Error(help);
  if (existsSync('.env.local')) process.loadEnvFile('.env.local');
  const folder = resolve('artifacts/media-lab', `${new Date().toISOString().replaceAll(':', '-')}-${randomUUID().slice(0, 8)}`);
  let lastStatus;
  let printedTask;
  const report = await runGeneration({
    kind, execute: values.execute, taskId: values.task, key: process.env.TOKENHUB_API_KEY || '',
    prompt: values.prompt ?? (kind === 'image' ? '흰 배경 위의 무광 검정 텀블러 제품 사진. 부드러운 스튜디오 조명, 글자와 로고 없음.' : '흰 배경 위의 무광 검정 텀블러가 천천히 회전한다. 고정된 카메라, 부드러운 스튜디오 조명, 글자와 로고 없음.'),
    onUpdate: async report => {
      // Keep a recovery path visible even if storage fails after a paid submission.
      if (report.taskId && printedTask !== report.taskId) {
        console.log(`조회 재개: npm run lab -- resume ${kind} --task ${report.taskId} --execute`);
        printedTask = report.taskId;
      }
      const status = `${report.status}${report.providerStatus ? ` / ${report.providerStatus}` : ''}`;
      if (status !== lastStatus) {
        console.log(`${status}${report.taskId ? ` · task: ${report.taskId}` : ''}`);
        lastStatus = status;
      }
      await mkdir(folder, { recursive: true, mode: 0o700 });
      // An interrupted write must not truncate the last usable task record.
      await writeFile(resolve(folder, 'report.json.tmp'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
      await rename(resolve(folder, 'report.json.tmp'), resolve(folder, 'report.json'));
      await writeFile(resolve(folder, 'index.html'), renderReport(report), { mode: 0o600 });
    }
  });
  console.log(`보고서: ${resolve(folder, 'index.html')}`);
  console.log(`기록: ${resolve(folder, 'report.json')}`);
  if (report.error) console.error(report.error);
  if (report.nextStep) console.error(report.nextStep);
  if (report.taskId && report.status !== 'succeeded') console.log(`조회 재개: npm run lab -- resume ${kind} --task ${report.taskId} --execute`);
  if (!['dry-run', 'succeeded'].includes(report.status)) process.exitCode = 1;
}

main().catch(error => {
  const key = process.env.TOKENHUB_API_KEY;
  console.error(key ? error.message.replaceAll(key, '[REDACTED]') : error.message);
  process.exitCode = 1;
});
