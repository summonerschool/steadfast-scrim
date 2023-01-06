import Discord, { ChannelType, MessageCreateOptions, VoiceChannel } from 'discord.js';

export interface DiscordService {
  sendMatchDirectMessage: (userIDs: string[], message: MessageCreateOptions) => Promise<number>;
  createVoiceChannels: (guildID: string, teamNames: [string, string]) => Promise<[VoiceChannel, VoiceChannel]>;
  deleteVoiceChannels: (guildID: string, ids: string[]) => Promise<boolean>;
  sendMessageInChannel: (msg: string) => void;
  createForumThread: (title: string, reason: string) => Promise<string>;
}

export const activeVoiceIDs = new Map<string, string[]>();

export const initDiscordService = (discordClient: Discord.Client) => {
  const voiceCategoryID = process.env.VOICE_CATEGORY_ID || '';
  const commandChannelID = process.env.COMMAND_CHANNEL_ID || '';

  const service: DiscordService = {
    createVoiceChannels: async (guildID, teamNames) => {
      const guild = await discordClient.guilds.fetch({ guild: guildID });

      const channels = await Promise.all([
        guild.channels.create({
          type: ChannelType.GuildVoice,
          name: teamNames[0],
          userLimit: 5,
          parent: voiceCategoryID
        }),
        guild.channels.create({
          type: ChannelType.GuildVoice,
          name: teamNames[1],
          userLimit: 5,
          parent: voiceCategoryID
        })
      ]);
      const curr = activeVoiceIDs.get(guildID) || [];
      activeVoiceIDs.set(guildID, [...curr, channels[0].id, channels[1].id]);
      return [channels[0], channels[1]];
    },
    sendMatchDirectMessage: async (userIDs: string[], message) => {
      const users = await Promise.all(userIDs.map((id) => discordClient.users.fetch(id)));
      const sent = await Promise.allSettled(users.map((u) => u.send(message)));
      return sent.filter((p) => p.status === 'fulfilled').length;
    },
    deleteVoiceChannels: async (guildID, ids) => {
      const guild = await discordClient.guilds.fetch({ guild: guildID });
      const current = activeVoiceIDs.get(guildID) || [];
      if (!current.some((id) => ids.includes(id))) {
        return false;
      }
      const channels = await Promise.all(ids.map((id) => guild.channels.fetch(id)));

      const teamVCs = channels.filter((vc): vc is VoiceChannel => vc != null && vc.parent?.id === voiceCategoryID);
      // Delete voice channels and remove them from active voice ids list
      const deleted = await Promise.all(teamVCs.map((vc) => vc.delete()));
      const deletedIDs = deleted.map((vc) => vc.id);
      activeVoiceIDs.set(
        guildID,
        current.filter((id) => !deletedIDs.includes(id))
      );
      console.log({ activeVoiceIDs, deleted });
      return true;
    },
    sendMessageInChannel: async (msg) => {
      let channel = discordClient.channels.cache.get(commandChannelID);
      if (!channel) {
        const res = await discordClient.channels.fetch(commandChannelID);
        if (res) channel = res;
        else {
          throw new Error('Could not send message');
        }
      }
      const commandChannel = channel as Discord.TextChannel;
      await commandChannel.send(msg);
    },
    createForumThread: async (title, reason) => {
      const feedbackChannelID = process.env.DISCORD_DISCUSSION_CHANNEL_ID || '';
      let channel = discordClient.channels.cache.get(feedbackChannelID);
      if (!channel) {
        const res = await discordClient.channels.fetch(feedbackChannelID);
        if (res) channel = res;
        else {
          throw new Error('Could not send message');
        }
      }
      const forum = channel as Discord.ForumChannel;
      const res = await forum.threads.create({
        name: title,
        autoArchiveDuration: 90,
        reason,
        message: {}
      });
      return res.id;
    }
  };
  return service;
};
