import fetch from 'node-fetch';
import { workspace, window, WorkspaceFolder } from 'vscode';

export async function getProblemCode(): Promise<String | undefined> {
  const problemCode = await window.showInputBox({
    placeHolder: 'Write problem code',
  });

  return problemCode;
}

export function getTextFromEditor(): String | undefined {
  const editor = window.activeTextEditor;
  if (editor) {
    const document = editor.document;
    let documentText = document.getText();
    documentText = documentText.replace(/\r?\n/g, '\r\n');

    return documentText;
  }
}

// submit code to jota [params => (userId, problemCode, sourceCode)]
export async function submitCode(
  userId: String,
  problemCode: String,
  sourceCode: String
) {
  const URL = 'http://203.254.143.156:8001/api/v2/submit/jcode';
  //   const URL = 'http://jota.jbnu.ac.kr/api/v2/submit/';
  const data = {
    judge_id: 'jota-judge',
    language: 'C',
    // jcode의 사용자 id를 사용해야하나? Jcode <-> Jota 계정 과의 연관성 확인 필요
    user: userId,
    problem: problemCode,
    source: sourceCode,
  };

  const options = {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'Content-type': 'application/json',
    },
  };

  //send rest to URL
  fetch(URL, options)
    .then((response) => response.json())
    .then((post) => {
      //show result to user
      const results: string[] = showResult(post);

      //save result to ./result
      saveAsFile(userId, problemCode, sourceCode, results);
    })
    .catch((error) => window.showErrorMessage(`Error: ${error}`));
}

function showResult(post: string): string[] {
  const submitResultArrs: string[] = [];
  const resultEmoj: string[] = [];

  //process result for show
  JSON.parse(post).forEach((element: string[], index: number) => {
    const result = element[0] == 'AC' ? '✅' : '❌';
    const spendTime = parseFloat(element[1]).toFixed(4);
    const spendMemory = parseFloat(element[2]).toFixed(2);
    const resultMsg = `Test case #${index}: ${element[0]} [${spendTime}s, ${spendMemory} KB]`;

    submitResultArrs.push(resultMsg);
    resultEmoj.push(` case #${index + 1} : ${result} `);
  });

  //show result use information message
  window.showInformationMessage(resultEmoj.join(' '));

  return submitResultArrs;
}

//save as text file
async function saveAsFile(
  userId: String,
  problemId: String,
  sourceCode: String,
  results: String[]
): Promise<void> {
  const path = require('path');
  const fs = require('fs');
  const saveFolderName = 'result';
  const workSpaceFolders: readonly WorkspaceFolder[] | undefined =
    workspace.workspaceFolders;

  if (!workSpaceFolders) return;

  const folderUri = workSpaceFolders[0].uri;
  const parentPath = path.join(folderUri.path, saveFolderName);

  //폴더가 없다면 생성
  !fs.existsSync(parentPath) && fs.mkdirSync(parentPath);

  const currDate = new Date();
  const _year = currDate.getFullYear().toString(),
    _month = (currDate.getMonth() + 1).toString(),
    _date = currDate.getDate().toString();

  const year = _year.slice(2),
    month = _month.length == 1 ? '0' + _month : _month,
    date = _date.length == 1 ? '0' + _date : _date;

  const basePath = path.join(parentPath, `${year}${month}${date}`);

  !fs.existsSync(basePath) && fs.mkdirSync(basePath);

  //파일의 최종 경로
  const fileName = `Submission@${currDate.getHours()}:${currDate.getMinutes()}:${currDate.getSeconds()}.txt`;
  const fileUri = folderUri.with({
    path: path.join(basePath, fileName),
  });

  //기록할 채점 결과 문자열 생성
  let data = `Submission of ${problemId} by ${userId}\n\n`;
  data += '-------- Execution Results--------\n';
  results.forEach((result) => (data += result.includes('AC') ? '✅ ' : '❌ '));
  data += '\n';
  data += results.join('\n');

  //소스코드 첨부
  data += '\n\n---------------- SOURCE CODE ---------------- \n';
  data += sourceCode;

  await workspace.fs.writeFile(fileUri, Buffer.from(data, 'utf8'));
}

//get User's id
export function getUserId(): string {
  return 'admin';
}