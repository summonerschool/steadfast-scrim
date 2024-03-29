import {EmbedBuilder} from "discord.js";
import {Role, User} from "@prisma/client";
import {POSITION_EMOJI_TRANSLATION} from "../utils/utils";

export const HighEloAdminEmbed = (requests: User[]) => {

  return new EmbedBuilder()
    .setColor(698371)
    .setTitle(`High Elo Request List`)
    .addFields({
      name: 'Users',
      value: requests.map(user => `<@${user.id}> : ${user.leagueIGN} (${user.region}) [op.gg](${urlEncodedLink(user.region, user.leagueIGN)})`).join('\n'), inline: true
    })
    .setTimestamp();
};


const regionToServer = (region: string) => {
  return  region.toLocaleLowerCase().startsWith('euw') ? 'euw' : 'na';
};

const urlEncodedLink = (region: string, ign: string) => {
  return `https://www.op.gg/summoners/${regionToServer(region)}/${encodeURIComponent(ign)}`
}
