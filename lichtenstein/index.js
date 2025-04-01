const core = require('@actions/core');
const github = require('@actions/github');
// const { exec } = require('child_process');
const { promisify } = require('util');
const { readFile, writeFile } = require('fs/promises');
const { spawn, exec } = require('child_process');
const execAsync = promisify(exec);


async function runCommand(command, opts = {}) {
    try {
        const { stdout, stderr } = await execAsync(command, opts); // Use 'dir' for Windows
        if (stderr) {
            console.error(`stderr: ${stderr}`);
        }
        console.log(`stdout:\n${stdout}`);
        return stdout;
    } catch (error) {
        console.error(`Error: ${error.message}`);
    }
}


function getFirstSundayBeforeOneYearAgo() {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 1);
    date.setDate(date.getDate() - date.getDay());
    return date;
}

// const {commits: commitDays, name, email} = JSON.parse((await readFile("commits.json")).toString());

// We do an initial commit way back in the past so we can easily do a reset back to the beginning
// const commits = [
//     `commit refs/heads/main\n` +
//     `committer Roy <roy@dochne.com> 1262347200 +0000\n` + 
//     `data 3\n` + 
//     `dot\n`
// ];

(async () => {
  const token = core.getInput('github-token', { required: true, trimWhitespace: true });
  const pattern = core.getInput('pattern', { required: true, trimWhitespace: true });
  const context = github.context;

  const octokit = github.getOctokit(token)
  let backoff = 5000;

  const date = getFirstSundayBeforeOneYearAgo();

  const commitDays = JSON.parse(pattern);
  const commits = [];
    for (const value of commitDays) {
        date.setDate(date.getDate() + 1);
        for (let x=0; x<46 * value; x++) {
            commits.push(
                `commit refs/heads/main\n` +
                `committer Roy <roy@dochne.com> ${Math.floor(date.getTime() / 1000)} +0000\n` + 
                `data 3\n` + 
                `dot\n`
            )
        }
    }

    console.log(commits.length);

    const fastImport = spawn('git', ['fast-import'], {
        stdio: ['pipe', 'inherit', 'inherit']
    });
    fastImport.stdin.write(commits.join("\n"));
    fastImport.stdin.end();

      
    fastImport.on('close', async (code) => {
        console.log("We've finished!", code);
        await runCommand("git log");
        await runCommand("git push --force");
    });

    await writeFile("fast-import.txt", commits.join("\n"));

    // await writeFile("fast-import.txt", commits.join("\n"));
    // < fast-import.txt
    // await runCommand("git fast-import", {
    //     input: commits.join("\n")
    // })
    
  

  // `git version`
  // try{
  //   while (true) {
  //     let job = await getJob(context, octokit, jobName);
  //     core.info(`Job Status: ${job.status}, Job Conclusion: ${job.conclusion}`)

  //     if (job.status !== 'in_progress') {
  //       if (job.conclusion === 'failure') {
  //         throw new Error(`The job ${job} has failed`);
  //       }
  //       return;
  //     }

  //     backoff = Math.min(backoff * 2, 30_000);
  //     core.info(`Backing off for ${backoff}`)
  //     await sleep(backoff);
  //   }
  // } catch (error) {
  //   if (error instanceof Error) {
  //     if (error.message === 'Not Found') {
  //       core.error(
  //         `It seems the job "${jobName}" doesn't exist in current repo. Are this filename correct?`
  //       )
  //     }
  //     core.setFailed(error.message)
  //   }
  // }
})();

