import {message, danger} from "danger"

const modified = danger.git.modified_files
const newFiles = danger.git.created_files
const prTitle = danger.github.pr.title

console.log(danger.git, danger.github.pr)

message(`Modified files: ${modified}`)
message(`Title of PR: ${prTitle}`)
