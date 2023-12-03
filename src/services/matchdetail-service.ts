import type {LobbyDetails, Team} from '../models/matchmaking';
import {ROLE_ORDER} from '../models/matchmaking';
import type {Draft, Player, PrismaClient, Region, Scrim, User} from '@prisma/client';
import {chance} from '../lib/chance';
import {LobbyDetailsEmbed, MatchDetailsEmbed} from '../components/match-message';
import type {DraftURLs} from '../models/external';
import type {DiscordService} from './discord-service';
import WebSocket from 'ws';
import type {Redis} from 'ioredis';

export interface MatchDetailService {
  sendMatchDetails(scrim: Scrim, users: User[], players: Player[], lobbyDetails: LobbyDetails): Promise<void>;
  storeDraft(scrimId: number, roomId: string): Promise<Draft>;
}

export class MatchDetailServiceImpl implements MatchDetailService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
    private readonly discordService: DiscordService
  ) {}

  public async sendMatchDetails(
    scrim: Scrim,
    users: User[],
    players: Player[],
    lobbyDetails: LobbyDetails
  ): Promise<void> {
    const { BLUE, RED } = this.sortUsersByTeam(users, players);
    const [voiceChannels, draftLobby, blueScoutingLink, redScoutingLink] = await Promise.all([
      this.discordService.createVoiceChannels(scrim, BLUE, RED),
      this.createDraftLobby(lobbyDetails.teamNames),
      this.generateScoutingLink(BLUE, scrim.region),
      this.generateScoutingLink(RED, scrim.region)
    ]);
    await this.redis.sadd(`${scrim.guildID}:scrim#${scrim.id}:voiceChannels`, ...voiceChannels.map((vc) => vc.id));
    const password = chance.integer({ min: 1000, max: 9999 });
    const matchEmbed = MatchDetailsEmbed(scrim, players, lobbyDetails);
    const blueEmbed = LobbyDetailsEmbed(
      lobbyDetails.teamNames[0],
      scrim.id,
      BLUE,
      RED,
      draftLobby.BLUE,
      `ss${scrim.id}`,
      password,
      blueScoutingLink,
      redScoutingLink
    );
    const redEmbed = LobbyDetailsEmbed(
      lobbyDetails.teamNames[1],
      scrim.id,
      RED,
      BLUE,
      draftLobby.RED,
      `ss${scrim.id}`,
      password,
      redScoutingLink,
      blueScoutingLink

    );

    // We have some test users that we don't want to send DMs to
    const nonTestPlayers = players.filter((p) => !p.userId.includes('-'));
    const blueIDs = nonTestPlayers.filter((p) => p.side === 'BLUE').map((p) => p.userId);
    const redIDs = nonTestPlayers.filter((p) => p.side === 'RED').map((p) => p.userId);

    const [dm1, dm2] = await Promise.all([
      this.discordService.sendMatchDirectMessage(blueIDs, {
        embeds: [matchEmbed, blueEmbed]
      }),
      this.discordService.sendMatchDirectMessage(redIDs, {
        embeds: [matchEmbed, redEmbed]
      }),
      this.prisma.draft.create({ data: { scrimId: scrim.id, draftRoomId: draftLobby.roomId } })
    ]);
    console.log(`${dm1 + dm2} DMs have been sent`);

    // Send invites after the DMs has been sent
    await Promise.all([
      ...voiceChannels.map((vc, i) =>
        vc.createInvite().then((invite) => {
          this.discordService.sendMatchDirectMessage(i === 0 ? blueIDs : redIDs, {
            content: `Invite for ${vc.name}: ${invite}`
          });
        })
      )
    ]);

    await this.discordService.sendMessageInChannel({
      embeds: [
        matchEmbed.addFields({
          name: 'Draft',
          value: `[Spectate Draft](${draftLobby.SPECTATOR})`
        })
      ]
    })
  }

  private sortUsersByTeam(users: User[], players: Player[]) {
    const red: (User | undefined)[] = [undefined, undefined, undefined, undefined, undefined];
    const blue: (User | undefined)[] = [undefined, undefined, undefined, undefined, undefined];
    for (const player of players) {
      const user = users.find((u) => u.id === player.userId);
      if (!user) continue;
      if (player.side === 'BLUE') blue[ROLE_ORDER[player.role]] = user;
      if (player.side === 'RED') red[ROLE_ORDER[player.role]] = user;
    }
    return { RED: red, BLUE: blue } as { RED: Team; BLUE: Team };
  }

  private generateScoutingLink(users: User[], region: Region) {
    const summoners = users.map((user) => encodeURIComponent(user.leagueIGN)).join(',');
    const server = region.toLocaleLowerCase().startsWith('euw') ? 'euw1' : 'na1';
    return `https://u.gg/multisearch?summoners=${summoners}&region=${server}`;
  }
  private async createDraftLobby(teamNames: [string, string]): Promise<DraftURLs> {
    type RoomCreatedResult = {
      type: string;
      roomId: string;
      bluePassword: string;
      redPassword: string;
      adminPassword: string;
    };

    const payload = {
      type: 'createroom',
      blueName: teamNames[0],
      redName: teamNames[1],
      disabledTurns: [],
      disabledChamps: [],
      timePerPick: 60,
      timePerBan: 60
    };
    return new Promise((resolve, reject) => {
      const ws = new WebSocket('wss://draftlol.dawe.gg/');
      ws.onopen = () => {
        ws.send(JSON.stringify(payload));
      };
      ws.onclose = () => console.log('CLOSED');
      ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data.toString());
        if (data.type === 'roomcreated') {
          const room: RoomCreatedResult = data;
          ws.close();

          const DRAFTLOL_URL = `https://draftlol.dawe.gg/${room.roomId}`;
          resolve({
            roomId: room.roomId,
            BLUE: `${DRAFTLOL_URL}/${room.bluePassword}`,
            RED: `${DRAFTLOL_URL}/${room.redPassword}`,
            SPECTATOR: DRAFTLOL_URL
          });
        }
      };
      ws.onerror = (err) => {
        reject(err);
      };
    });
  }

  public async storeDraft(scrimId: number, roomId: string): Promise<Draft> {
    const { blueBans, bluePicks, redBans, redPicks } = await new Promise<Partial<Draft>>((resolve, reject) => {
      const ws = new WebSocket('wss://draftlol.dawe.gg/');
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'joinroom', roomId: roomId }));
      };
      ws.onmessage = (msg) => {
        ws.close();
        const data = JSON.parse(msg.data.toString());
        if (data.type === 'statechange') {
          const { bluePicks, redPicks, blueBans, redBans } = data.newState;
          resolve({ bluePicks, redPicks, blueBans, redBans });
        } else if (data.type === 'error') {
          reject(data.reason);
        } else {
          reject('unknown event');
        }
      };
      ws.onerror = (err) => {
        reject(err);
      };
    });
    const removeTimedOutRounds = (val: string[] | undefined) => (val ? val.filter((x) => typeof x === 'string') : []);

    const res = await this.prisma.draft.update({
      where: { scrimId_draftRoomId: { scrimId, draftRoomId: roomId } },
      data: {
        blueBans: removeTimedOutRounds(blueBans),
        bluePicks: removeTimedOutRounds(bluePicks),
        redBans: removeTimedOutRounds(redBans),
        redPicks: removeTimedOutRounds(redPicks)
      }
    });
    return res;
  }
}
