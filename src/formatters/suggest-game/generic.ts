import { User } from "discord.js";

export const mention=(u: User) =>{
  return `<@${u.id}>`;
}

export const mentionById=(id: string) =>{
  return `<@${id}>`;
}

export const unknownCommand = (cmd: string) => {
  return `Unknown command: \`${cmd}\``;
}

export const unknownSubcommand = (cmd: string) => {
  return `Unknown subcommand: \`${cmd}\``;
}