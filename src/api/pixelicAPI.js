const { cacheMessage, errorMessage } = require('../functions/logger.js');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const { validateUUID, getUUID } = require('./mojangAPI.js');
const { generateID } = require('../functions/helper.js');
const config = require('../../config.json');
const nodeCache = require('node-cache');
const fetch = (...args) =>
  import('node-fetch')
    .then(({ default: fetch }) => fetch(...args))
    .catch((err) => console.log(err));

const pixelicCache = new nodeCache({ stdTTL: config.other.cacheTimeout });

async function register(uuid) {
  try {
    uuid = uuid.replace(/-/g, '');
    var check = await validateUUID(uuid);
    if (!check) {
      await getUUID(uuid);
      check = await validateUUID(uuid);
    }
    if (!check) throw new Error({ status: 400, error: 'Invalid UUID' });
    var res = await fetch(`https://api.pixelic.de/wynncraft/v1/player/${uuid}/register`, {
      method: 'POST',
      headers: { 'X-API-Key': config.api.pixelicAPIKey },
    });
    if (res.status === 201) {
      return { status: res.status, success: true, info: 'Registered' };
    } else {
      var data = await res.json();
      throw new Error({ status: res.status, error: data.cause });
    }
  } catch (error) {
    var errorId = generateID(config.other.errorIdLength);
    errorMessage(`Error ID: ${errorId}`);
    console.log(error);
    return error;
  }
}

async function registerGuild(guild) {
  try {
    var members = Object.values(guild.members).flatMap((rankData) => Object.values(rankData).map((data) => data.uuid));
    const chunkSize = 20;
    let registeredCount = 0;
    for (let i = 0; i < members.length; i += chunkSize) {
      const chunk = members.slice(i, i + chunkSize);
      for (const uuid of chunk) {
        const registered = await register(uuid);
        if (registered.success) {
          registeredCount++;
        }
      }
      if (i + chunkSize < members.length) {
        await delay(1500);
      }
    }
    return registeredCount;
  } catch (error) {
    var errorId = generateID(config.other.errorIdLength);
    errorMessage(`Error ID: ${errorId}`);
    console.log(error);
  }
}

async function getServerList() {
  try {
    if (pixelicCache.has('serverList')) {
      cacheMessage('PixelicAPI', 'hit');
      return pixelicCache.get('serverList');
    } else {
      var res = await fetch(`https://api.pixelic.de/wynncraft/v1/server/list`, {
        headers: { 'X-API-Key': config.api.pixelicAPIKey },
      });
      var data = await res.json();
      if (res.status === 200) {
        console.log(data);
        var response = { status: res.status, success: true };
        pixelicCache.set('serverList', response);
        return response;
      } else {
        throw new Error({ status: res.status, error: data.cause });
      }
    }
  } catch (error) {
    var errorId = generateID(config.other.errorIdLength);
    errorMessage(`Error ID: ${errorId}`);
    console.log(error);
    return error;
  }
}

async function getServerHistory(id, timeframe) {
  try {
    timeframe = timeframe.toLowerCase();
    var options = ['hour', 'day', 'week', 'month', 'year', 'alltime'];
    if (!options.includes(timeframe)) throw new Error({ status: 400, error: 'Invalid timeframe' });
    let server;
    id = id.toString().toLowerCase();
    if (id.includes('yt')) {
      server = `WCYT`;
      id = 'YT';
    } else {
      if (!id.includes('wc')) {
        server = `WC${id}`;
        id = Number(id);
      } else {
        server = id;
        id = Number(id.replace('wc', ''));
      }
      if (id >= !0 && id <= !75) {
        throw new Error({ status: 400, error: 'Invalid Server' });
      }
    }
    if (pixelicCache.has(`${id}-${timeframe}`)) {
      cacheMessage('PixelicAPI', 'hit');
      return pixelicCache.get(`${id}-${timeframe}`);
    } else {
      var res = await fetch(`https://api.pixelic.de/wynncraft/v1/server/${server}/${timeframe}`, {
        headers: { 'X-API-Key': config.api.pixelicAPIKey },
      });
      var data = await res.json();
      if (res.status === 200) {
        var response = { status: res.status, success: true, data: data.data };
        pixelicCache.set(`${id}-${timeframe}`, response);
        return response;
      } else {
        throw new Error({ status: res.status, success: false, error: data.cause });
      }
    }
  } catch (error) {
    var errorId = generateID(config.other.errorIdLength);
    errorMessage(`Error ID: ${errorId}`);
    console.log(error);
    return error;
  }
}

async function getServerUptimes() {
  try {
    if (pixelicCache.has('serverUptimes')) {
      cacheMessage('PixelicAPI', 'hit');
      return pixelicCache.get('serverUptimes');
    } else {
      var res = await fetch(`https://api.pixelic.de/wynncraft/v1/server/list/uptime`, {
        headers: { 'X-API-Key': config.api.pixelicAPIKey },
      });
      var data = await res.json();
      if (res.status === 200) {
        var response = { status: res.status, success: true, servers: data.servers };
        pixelicCache.set('serverUptimes', response);
        return response;
      } else {
        throw new Error({ status: res.status, success: false, error: data.cause });
      }
    }
  } catch (error) {
    var errorId = generateID(config.other.errorIdLength);
    errorMessage(`Error ID: ${errorId}`);
    console.log(error);
    return error;
  }
}

async function getServerUptime(id) {
  try {
    let serverName;
    id = id.toString().toLowerCase();
    if (id.includes('yt')) {
      serverName = `YT`;
      id = 'YT';
    } else {
      if (!id.includes('wc')) {
        serverName = `WC${id}`;
        id = Number(id);
      } else {
        serverName = id.toUpperCase();
        id = Number(id.replace('wc', ''));
      }
      if (id >= !0 && id <= !75) {
        throw new Error({ status: 400, error: 'Invalid Server' });
      }
    }
    var servers = await getServerUptimes();
    var server = servers.servers.find((server) => server.name === serverName);
    if (server) {
      return { name: server.name, onlineSince: server.onlineSince };
    } else {
      return { name: serverName, offlineSince: null };
    }
  } catch (error) {
    var errorId = generateID(config.other.errorIdLength);
    errorMessage(`Error ID: ${errorId}`);
    console.log(error);
    return error;
  }
}

async function getHistoryStats(uuid, timeframe) {
  try {
    var check = await validateUUID(uuid);
    if (!check) {
      await getUUID(uuid);
      check = await validateUUID(uuid);
    }
    timeframe = timeframe.toLowerCase();
    var options = ['daily', 'weekly', 'monthly'];
    if (!options.includes(timeframe)) throw new Error({ status: 400, error: 'Invalid timeframe' });
    var res = await fetch(`https://api.pixelic.de/wynncraft/v1/player/${uuid}/history/${timeframe}`, {
      headers: { 'X-API-Key': config.api.pixelicAPIKey },
    });
    var data = await res.json();
    if (res.status === 200) {
      return { status: res.status, success: true, data: data.data };
    } else {
      throw new Error({ status: res.status, error: data.cause });
    }
  } catch (error) {
    var errorId = generateID(config.other.errorIdLength);
    errorMessage(`Error ID: ${errorId}`);
    console.log(error);
    return error;
  }
}

function clearPixelicCache() {
  try {
    cacheMessage('PixelicAPI', 'Cleared');
    pixelicCache.flushAll();
    return 'Cleared';
  } catch (error) {
    var errorId = generateID(config.other.errorIdLength);
    errorMessage(`Error ID: ${errorId}`);
    console.log(error);
    return error;
  }
}

module.exports = {
  register,
  registerGuild,
  getServerList,
  getServerHistory,
  getServerUptimes,
  getServerUptime,
  getHistoryStats,
  clearPixelicCache,
};
