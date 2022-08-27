import { Player, PrismaClient, User } from '@prisma/client';

(async () => {
  const prisma = new PrismaClient();
  const scrims = await prisma.scrim.findMany({ include: { players: true } });
  const users = await prisma.user.findMany({
    where: { player: { some: { scrim_id: { in: scrims.map((s) => s.id) } } } }
  });
  const userMap = new Map<string, User>(users.map((u) => [u.id, { ...u, elo: u.external_elo }]));
  for (const scrim of scrims) {
    if (scrim.status === 'REMAKE' || scrim.status === 'STARTED') {
      const promises = scrim.players.map((p) =>
        prisma.player.update({
          where: { user_id_scrim_id: { scrim_id: p.scrim_id, user_id: p.user_id } },
          data: { pregameElo: userMap.get(p.user_id)!!.elo }
        })
      );
      await Promise.all(promises);
    } else if (scrim.status === 'COMPLETED') {
      const blue: Player[] = [];
      const red: Player[] = [];
      for (const player of scrim.players) {
        if (player.side === 'BLUE') blue.push(player);
        if (player.side === 'RED') red.push(player);
      }
      const totalBlueElo = blue.reduce((prev, curr) => {
        const user = userMap.get(curr.user_id)!!;
        let elo = prev + user.elo;
        if (curr.role != user.main) {
          elo -= 200;
        }
        return elo;
      }, 0);
      const totalRedElo = red.reduce((prev, curr) => {
        const user = userMap.get(curr.user_id)!!;
        let elo = prev + user.elo;
        if (curr.role != user.main) {
          elo -= 200;
        }
        return elo;
      }, 0);
      console.log({totalBlueElo, totalRedElo})
      const blueWinChances = 1 / (1 + 10 ** ((totalRedElo - totalBlueElo) / 650));
      const redWinChances = 1 - blueWinChances;
      const promises = scrim.players.map((player) => {
        const user = userMap.get(player.user_id)!!;
        const totalGames = user.wins + user.losses;
        const K = totalGames <= 14 ? 60 - 2 * totalGames : 32;
        const eloChange = Math.round(K * (scrim.winner === 'BLUE' ? 1 - blueWinChances : 1 - redWinChances));
        const hasWon = scrim.players.find((p) => p.user_id === user.id)!!.side === scrim.winner;
        const elo = hasWon ? user.elo + eloChange : user.elo - eloChange;
        // console.log(`${user.league_ign}: ${user.elo} -> ${elo} after game #${scrim.id}`);
        userMap.set(user.id, {
          ...user,
          elo: elo,
          wins: hasWon ? user.wins + 1 : user.wins,
          losses: hasWon ? user.losses : user.losses + 1
        });
        return prisma.player.update({
          where: { user_id_scrim_id: { scrim_id: player.scrim_id, user_id: player.user_id } },
          data: { pregameElo: elo }
        });
      });
      const res = await Promise.all(promises);
    }
  }

  const promises = [...userMap.values()].map((user) =>
    prisma.user.update({
      where: { id: user.id },
      data: { elo: user.elo }
    })
  );
  await Promise.all(promises)
})();
