import { User } from "discord.js";

export const mention=(u: User) =>{
  return `<@${u.id}>`;
}

export const mentionById=(id: string) =>{
  return `<@${id}>`;
}