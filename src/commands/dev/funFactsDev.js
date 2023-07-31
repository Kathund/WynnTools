const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle } = require('discord.js');
const { blacklistCheck, generateID, writeAt } = require('../../helperFunctions.js');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const { getUsername } = require('../../api/discordAPI.js');
const { errorMessage } = require('../../logger.js');
const config = require('../../../config.json');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fun-facts-dev')
    .setDescription('Fun Facts but the dev commands (Dev Only)')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('list')
        .setDescription('Generate a list of all fun facts or all suggestions')
        .addStringOption((option) =>
          option
            .setName('type')
            .setDescription('The type of list you want to generate')
            .setRequired(true)
            .addChoices({ name: 'Facts', value: 'suggested' }, { name: 'List', value: 'list' })
        )
    )
    .addSubcommand((subcommand) => subcommand.setName('send').setDescription('force send fun facts'))
    .addSubcommand((subcommand) =>
      subcommand
        .setName('view')
        .setDescription('View a fun fact')
        .addStringOption((option) =>
          option
            .setName('type')
            .setDescription('The type of fun fact')
            .setRequired(true)
            .addChoices({ name: 'Facts', value: 'suggested' }, { name: 'List', value: 'list' })
        )
        .addStringOption((option) => option.setName('id').setDescription('The ID of the fun fact').setRequired(true))
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('approve')
        .setDescription('Approve a fun fact')
        .addStringOption((option) => option.setName('id').setDescription('The ID of the fun fact').setRequired(true))
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('deny')
        .setDescription('Deny a fun fact')
        .addStringOption((option) => option.setName('id').setDescription('The ID of the fun fact').setRequired(true))
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('delete')
        .setDescription('Delete a fun fact')
        .addStringOption((option) =>
          option
            .setName('type')
            .setDescription('The type of fun fact')
            .setRequired(true)
            .addChoices({ name: 'Facts', value: 'suggested' }, { name: 'List', value: 'list' })
        )
        .addStringOption((option) => option.setName('id').setDescription('The ID of the fun fact').setRequired(true))
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('configs')
        .setDescription('View the configs for fun facts')
        .addStringOption((option) =>
          option
            .setName('server-id')
            .setDescription('The ID of the server you want to view the configs for')
            .setRequired(false)
        )
    ),
  async execute(interaction) {
    var startTime = Math.floor(Date.now() / 1000);
    const blacklist = new Set();
    function checkFunFact(fact) {
      try {
        if (fact.lastSent + 1209600 < startTime) {
          return true; // Older than 14 days
        } else {
          return false; // Younger than 14 days
        }
      } catch (error) {
        console.error(error);
        return false;
      }
    }

    const funFactList = JSON.parse(fs.readFileSync('data/funFacts/list.json', 'utf8'));
    function getRandomFact() {
      try {
        const validFacts = funFactList.facts.filter((fact) => !blacklist.has(fact.id));
        if (validFacts.length === 0) {
          console.log('No more valid fun facts available.');
          return null;
        }
        const randomFact = validFacts[Math.floor(Math.random() * validFacts.length)];
        return randomFact;
      } catch (error) {
        console.log(error);
        return null;
      }
    }

    try {
      var blacklistTest = await blacklistCheck(interaction.user.id);
      if (blacklistTest) throw new Error('You are blacklisted');
      if (!(await interaction.guild.members.fetch(interaction.user)).roles.cache.has(config.discord.roles.dev)) {
        throw new Error('No Perms');
      }
      var subcommand = interaction.options.getSubcommand();

      const suggestedData = JSON.parse(fs.readFileSync('data/funFacts/suggested.json'));
      const listData = JSON.parse(fs.readFileSync('data/funFacts/list.json'));
      const factList = listData.facts;
      let i = 0;
      let list = '';
      let msg;
      if (subcommand === 'list') {
        var type = interaction.options.getString('type');
        if (type === 'list') {
          for (let i = 0; i < factList.length; i++) {
            const fact = factList[i];
            list += `**${i + 1}**`;
            if (fact.lastSent > 0) {
              list += ` - Last Sent: <t:${fact.lastSent}:R>\n`;
            } else {
              list += '\n';
            }
          }

          const listEmbed = new EmbedBuilder()
            .setColor(config.discord.embeds.green)
            .setTitle('Fun Facts List')
            .setDescription(list)
            .setFooter({
              text: `by @kathund | ${config.discord.supportInvite} for support`,
              iconURL: 'https://i.imgur.com/uUuZx2E.png',
            });
          return await interaction.reply({ embeds: [listEmbed] });
        } else if (type === 'suggested') {
          const objects = Object.keys(suggestedData);
          if (objects.length == 0) throw new Error('No suggestions');
          for (i = 0; i < objects.length; i++) {
            list += `**${i + 1}** -  ID: ${objects[i]}\n`;
          }

          const listEmbed = new EmbedBuilder()
            .setColor(config.discord.embeds.green)
            .setTitle('Fun Facts List')
            .setDescription(list)
            .setFooter({
              text: `by @kathund | ${config.discord.supportInvite} for support`,
              iconURL: 'https://i.imgur.com/uUuZx2E.png',
            });
          return await interaction.reply({ embeds: [listEmbed] });
        }
      } else if (subcommand === 'send') {
        const confirmEmbed = new EmbedBuilder()
          .setColor(config.discord.embeds.green)
          .setTitle('Are you sure?')
          .setDescription('This will send fun-facts to every setup server')
          .setFooter({
            text: `by @kathund | ${config.discord.supportInvite} for support`,
            iconURL: 'https://i.imgur.com/uUuZx2E.png',
          });

        const confirmButton = new ButtonBuilder()
          .setLabel('Confirm')
          .setCustomId('funFactsDevSendConfirm')
          .setStyle(ButtonStyle.Success);

        const cancelButton = new ButtonBuilder()
          .setLabel('Cancel')
          .setCustomId('funFactsDevSendCancel')
          .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

        msg = await interaction.reply({ embeds: [confirmEmbed], components: [row] });
        const collectorFilter = (i) => i.user.id === interaction.user.id;
        try {
          const confirmation = await msg.awaitMessageComponent({ filter: collectorFilter, time: 30_000 });
          if (confirmation.customId == 'funFactsDevSendConfirm') {
            try {
              let funFact;
              let numCheckedFacts = 0;
              const totalFacts = Object.keys(JSON.parse(fs.readFileSync('data/funFacts/list.json', 'utf8'))).length;

              do {
                funFact = getRandomFact();
                if (funFact && checkFunFact(funFact)) {
                  /* empty */
                } else if (funFact) {
                  blacklist.add(funFact.id);
                }
                numCheckedFacts++;
              } while (funFact && !checkFunFact(funFact) && numCheckedFacts < totalFacts);

              if (!funFact || (funFact && !checkFunFact(funFact))) {
                console.log('No valid fun facts found.');
              }

              const funFactConfigs = JSON.parse(fs.readFileSync('data/funFacts/config.json', 'utf8'));
              const funFactConfigsObject = Object.keys(funFactConfigs);

              const setup = new ButtonBuilder()
                .setCustomId('setupGuideFunFacts')
                .setLabel('How to setup')
                .setStyle(ButtonStyle.Primary);

              const row = new ActionRowBuilder().addComponents(setup);

              var requestedByString = '';
              if (funFact.requestedBy && funFact.hidden != false) {
                requestedByString = `Requested by ${await getUsername(funFact.requestedBy)} | `;
              }

              const funFactEmbed = new EmbedBuilder()
                .setColor(config.discord.embeds.green)
                .setDescription(
                  `**Today's Fun fact is** \n${funFact.fact}\n\n${requestedByString}Next fun fact <t:${
                    startTime + 86400
                  }:R>`
                )
                .setFooter({
                  text: `by @kathund | https://discord.gg/ub63JjGGSN for support`,
                  iconURL: 'https://i.imgur.com/uUuZx2E.png',
                });
              let currentConfig;
              for (let i = 0; i < funFactConfigsObject.length; i++) {
                currentConfig = funFactConfigs[funFactConfigsObject[i]];
                if (currentConfig.disabled) return;
                const serverId = currentConfig.serverId;
                const channelId = currentConfig.channelId;
                const guild = interaction.client.guilds.cache.get(serverId);
                const channel = guild.channels.cache.get(channelId);
                var role = currentConfig.roleId;
                if (role === serverId) {
                  role = '@everyone';
                } else if (role === null) {
                  role = '';
                } else {
                  role = `<@&${role}>`;
                }
                if (currentConfig.deleteMsgs) await channel.bulkDelete(100);
                if (currentConfig.role === null) {
                  await channel.send({ embeds: [funFactEmbed], components: [row] });
                } else {
                  if (currentConfig.ghostPing) {
                    await channel.sent({ content: role });
                    await channel.bulkDelete(1);
                    await delay(300);
                    await channel.send({ embeds: [funFactEmbed], components: [row] });
                  } else {
                    await channel.send({ embeds: [funFactEmbed], components: [row], content: role });
                  }
                }
                await delay(300);
              }
              await writeAt(
                'data/funFacts/list.json',
                'facts',
                funFactList.facts.map((fact) =>
                  fact.id === funFact.id
                    ? {
                        ...fact,
                        lastSent: startTime,
                      }
                    : fact
                )
              );
              await writeAt('data/funFacts/list.json', 'next', startTime + 86400);
            } catch (error) {
              console.error(error);
            }

            const updatedEmbed = new EmbedBuilder()
              .setColor(config.discord.embeds.green)
              .setDescription('Sent all Fun Facts')
              .setTimestamp()
              .setFooter({
                text: `by @kathund | ${config.discord.supportInvite} for support`,
                iconURL: 'https://i.imgur.com/uUuZx2E.png',
              });

            await confirmation.update({
              embeds: [updatedEmbed],
              components: [],
            });
          } else if (confirmation.customId == 'funFactsDevSendCancel') {
            const cancelEmbed = new EmbedBuilder()
              .setColor(config.discord.embeds.red)
              .setDescription('Cancelled sending Fun Facts')
              .setTimestamp()
              .setFooter({
                text: `by @kathund | ${config.discord.supportInvite} for support`,
                iconURL: 'https://i.imgur.com/uUuZx2E.png',
              });

            await confirmation.update({
              embeds: [cancelEmbed],
              components: [],
            });
          }
        } catch (error) {
          const cancelEmbed = new EmbedBuilder()
            .setColor(config.discord.embeds.red)
            .setDescription('Cancelled sending Fun Facts')
            .setTimestamp()
            .setFooter({
              text: `by @kathund | ${config.discord.supportInvite} for support`,
              iconURL: 'https://i.imgur.com/uUuZx2E.png',
            });

          await interaction.editReply({
            embeds: [cancelEmbed],
            components: [],
          });
        }
      } else if (subcommand === 'view') {
        var facType = interaction.options.getString('type');
        var facId = interaction.options.getString('id');
        let fact;
        if (facType === 'list') {
          fact = listData[facId];
          if (!fact) throw new Error('Invalid ID');
          let requestedByString = '';
          if (fact.requestedBy && fact.hidden == false) {
            requestedByString = `Requested by ${await getUsername(fact.requestedBy)}`;
          }
          if (fact.lastSent > 0) {
            requestedByString = `${requestedByString} | Last sent <t:${fact.lastSent}:R>`;
          } else {
            requestedByString = `${requestedByString} | Never been sent`;
          }

          const factEmbed = new EmbedBuilder()
            .setColor(config.discord.embeds.green)
            .setTitle(`Fun Fact #${fact.id}`)
            .setDescription(`${fact.fact}\n\n${requestedByString}`)
            .setTimestamp()
            .setFooter({
              text: `by @kathund | ${config.discord.supportInvite} for support`,
              iconURL: 'https://i.imgur.com/uUuZx2E.png',
            });

          await interaction.reply({ embeds: [factEmbed] });
        } else if (facType === 'suggested') {
          fact = suggestedData[facId];
          if (!fact) throw new Error('Invalid ID');

          const factEmbed = new EmbedBuilder()
            .setColor(config.discord.embeds.green)
            .setTitle(`Fun Fact #${fact.id}`)
            .setDescription(
              `${fact.fact}\n\nRequested by ${await getUsername(fact.by)} | Requested at <t:${fact.at}:R>`
            )
            .setTimestamp()
            .setFooter({
              text: `by @kathund | ${config.discord.supportInvite} for support`,
              iconURL: 'https://i.imgur.com/uUuZx2E.png',
            });

          await interaction.reply({ embeds: [factEmbed] });
        }
      } else if (subcommand === 'approve') {
        const id = interaction.options.getString('id');
        const fact = suggestedData[id];
        if (!fact) throw new Error('Invalid ID');
        if (suggestedData[id].notify) {
          const notifyEmbed = new EmbedBuilder()
            .setColor(config.discord.embeds.green)
            .setTitle('Fun Fact Approved')
            .setDescription(
              `Your Fun Fact has been approved and added to the list of Fun Facts\n\n**Fun Fact Id:** ${id}\n**Fun Fact:** ${fact.fact}`
            )
            .setTimestamp()
            .setFooter({
              text: `by @kathund | ${config.discord.supportInvite} for support`,
              iconURL: 'https://i.imgur.com/uUuZx2E.png',
            });

          await interaction.client.users.send(suggestedData[id].by, { embeds: [notifyEmbed] });

          const factEmbed = new EmbedBuilder()
            .setColor(config.discord.embeds.green)
            .setTitle('Fun Fact Approved')
            .setDescription(
              `The Fun Fact has been approved and added to the list of Fun Facts. The user has been successfully notified\n\n**Fun Fact Id:** ${id}\n**Fun Fact:** ${fact.fact}`
            )
            .setTimestamp()
            .setFooter({
              text: `by @kathund | ${config.discord.supportInvite} for support`,
              iconURL: 'https://i.imgur.com/uUuZx2E.png',
            });

          await interaction.reply({ embeds: [factEmbed] });
        } else {
          const factEmbed = new EmbedBuilder()
            .setColor(config.discord.embeds.green)
            .setTitle('Fun Fact Approved')
            .setDescription(
              `The Fun Fact has been approved and added to the list of Fun Facts.\n\n**Fun Fact Id:** ${id}\n**Fun Fact:** ${fact.fact}`
            )
            .setTimestamp()
            .setFooter({
              text: `by @kathund | ${config.discord.supportInvite} for support`,
              iconURL: 'https://i.imgur.com/uUuZx2E.png',
            });

          await interaction.reply({ embeds: [factEmbed] });
        }

        await writeAt('data/funFacts/list.json', id, {
          requestedBy: fact.by,
          fact: fact.fact,
          id: id,
          lastSent: 0,
        });
        delete suggestedData[id];
        fs.writeFileSync('data/funFacts/suggested.json', JSON.stringify(suggestedData));
      } else if (subcommand === 'deny') {
        const id = interaction.options.getString('id');
        const fact = suggestedData[id];
        if (!fact) throw new Error('Invalid ID');
        if (suggestedData[id].notify) {
          const notifyEmbed = new EmbedBuilder()
            .setColor(config.discord.embeds.red)
            .setTitle('Fun Fact Denied')
            .setDescription(
              `Your Fun Fact has been denied and not added to the list of Fun Facts\n\n**Fun Fact Id:** ${id}\n**Fun Fact:** ${fact.fact}`
            )
            .setTimestamp()
            .setFooter({
              text: `by @kathund | ${config.discord.supportInvite} for support`,
              iconURL: 'https://i.imgur.com/uUuZx2E.png',
            });

          await interaction.client.users.send(suggestedData[id].by, { embeds: [notifyEmbed] });

          const factEmbed = new EmbedBuilder()
            .setColor(config.discord.embeds.red)
            .setTitle('Fun Fact Denied')
            .setDescription(
              `The Fun Fact has been denied and not added to the list of Fun Facts. The user has been successfully notified\n\n**Fun Fact Id:** ${id}\n**Fun Fact:** ${fact.fact}`
            )
            .setTimestamp()
            .setFooter({
              text: `by @kathund | ${config.discord.supportInvite} for support`,
              iconURL: 'https://i.imgur.com/uUuZx2E.png',
            });

          await interaction.reply({ embeds: [factEmbed] });
        } else {
          const factEmbed = new EmbedBuilder()
            .setColor(config.discord.embeds.red)
            .setTitle('Fun Fact Denied')
            .setDescription(
              `The Fun Fact has been denied and not added to the list of Fun Facts.\n\n**Fun Fact Id:** ${id}\n**Fun Fact:** ${fact.fact}`
            )
            .setTimestamp()
            .setFooter({
              text: `by @kathund | ${config.discord.supportInvite} for support`,
              iconURL: 'https://i.imgur.com/uUuZx2E.png',
            });

          await interaction.reply({ embeds: [factEmbed] });
        }

        delete suggestedData[id];
        fs.writeFileSync('data/funFacts/suggested.json', JSON.stringify(suggestedData));
      } else if (subcommand === 'delete') {
        var id = interaction.options.getString('id');
        var fact = listData[id];
        if (!fact) throw new Error('Invalid ID');
        const factEmbed = new EmbedBuilder()
          .setColor(config.discord.embeds.red)
          .setTitle('Are you sure?')
          .setDescription(
            `Are you sure you want to delete the Fun Fact?\n\n**Fun Fact Id:** ${id}\n**Fun Fact:** ${fact.fact}`
          )
          .setTimestamp()
          .setFooter({
            text: `by @kathund | ${config.discord.supportInvite} for support`,
            iconURL: 'https://i.imgur.com/uUuZx2E.png',
          });

        const confirmButton = new ButtonBuilder()
          .setLabel('Confirm')
          .setStyle(ButtonStyle.Danger)
          .setCustomId('confirm');

        const cancelButton = new ButtonBuilder()
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Secondary)
          .setCustomId('cancel');

        const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

        msg = await interaction.reply({ embeds: [factEmbed], components: [row] });
      } else if (subcommand === 'configs') {
        var serverId = interaction.options.getString('server-id');
        const configs = JSON.parse(fs.readFileSync('data/funFacts/config.json', 'utf8'));
        const configsObject = Object.keys(configs);
        let currentConfig;
        if (serverId === null) {
          var num = 0;
          currentConfig = configs[configsObject[num]];
          const guild = interaction.client.guilds.cache.get(currentConfig.serverId);
          const channel = guild.channels.cache.get(currentConfig.channelId);
          let string = `**Server Name:** ${guild.name} (${guild.id}) \n\n**Config**\n**Channel:** <#${channel.id}> | ${channel.name} (${channel.id})`;
          if (currentConfig.roleId) {
            const role = guild.roles.cache.get(currentConfig.roleId);
            if (role.id === guild.id) {
              string += `\n**Role:** @everyone | @everyone (${role.id})`;
            } else {
              string += `\n**Role:** <@&${role.id}> | ${role.name} (${role.id})`;
            }
          } else {
            string += `\n**Role:** None`;
          }
          string += `\n**Ghost Ping:** ${
            currentConfig.ghostPing ? config.discord.emojis.yes : config.discord.emojis.no
          }`;
          string += `\n**Delete Messages:** ${
            currentConfig.deleteMsgs ? config.discord.emojis.yes : config.discord.emojis.no
          }`;
          string += `\n**Disabled:** ${currentConfig.disabled ? config.discord.emojis.yes : config.discord.emojis.no}`;
          const configEmbed = new EmbedBuilder()
            .setColor(config.discord.embeds.green)
            .setTitle(`Fun Fact Configs - ${currentConfig.serverId}`)
            .setDescription(string);

          const leftButton = new ButtonBuilder()
            .setEmoji('1135038841426825297')
            .setStyle(ButtonStyle.Secondary)
            .setCustomId('leftButtonConfigs');

          const trashButton = new ButtonBuilder()
            .setEmoji('1135050640524066837')
            .setStyle(ButtonStyle.Danger)
            .setCustomId('trashButtonConfigs');

          const rightButton = new ButtonBuilder()
            .setEmoji('1135038844706762799')
            .setStyle(ButtonStyle.Secondary)
            .setCustomId('rightButtonConfigs');

          const row = new ActionRowBuilder().addComponents(leftButton, trashButton, rightButton);
          msg = await interaction.reply({ embeds: [configEmbed], components: [row] });
          const collectorFilter = (i) => i.user.id === interaction.user.id;
          try {
            const confirmation = await msg.awaitMessageComponent({ filter: collectorFilter, time: 30_000 });
            console.log(confirmation.customId);
            if (confirmation.customId === 'leftButtonConfigs') {
              num = num - 1;
              if (num > configsObject.length) num = 0;
              currentConfig = configs[num];
              console.log(currentConfig);
              const guild = interaction.client.guilds.cache.get(currentConfig.serverId);
              const channel = guild.channels.cache.get(currentConfig.channelId);
              let string = `**Server Name:** ${guild.name} (${guild.id}) \n\n**Config**\n**Channel:** <#${channel.id}> | ${channel.name} (${channel.id})`;
              if (currentConfig.roleId) {
                const role = guild.roles.cache.get(currentConfig.roleId);
                if (role.id === guild.id) {
                  string += `\n**Role:** @everyone | @everyone (${role.id})`;
                } else {
                  string += `\n**Role:** <@&${role.id}> | ${role.name} (${role.id})`;
                }
              } else {
                string += `\n**Role:** None`;
              }
              string += `\n**Ghost Ping:** ${
                currentConfig.ghostPing ? config.discord.emojis.yes : config.discord.emojis.no
              }`;
              string += `\n**Delete Messages:** ${
                currentConfig.deleteMsgs ? config.discord.emojis.yes : config.discord.emojis.no
              }`;
              string += `\n**Disabled:** ${
                currentConfig.disabled ? config.discord.emojis.yes : config.discord.emojis.no
              }`;

              const configEmbed = new EmbedBuilder()
                .setColor(config.discord.embeds.green)
                .setTitle(`Fun Fact Configs - ${currentConfig.serverId}`)
                .setDescription(string);

              const leftButton = new ButtonBuilder()
                .setEmoji('1135038841426825297')
                .setStyle(ButtonStyle.Secondary)
                .setCustomId('left');

              const trashButton = new ButtonBuilder()
                .setEmoji('1135050640524066837')
                .setStyle(ButtonStyle.Danger)
                .setCustomId('trash');

              const rightButton = new ButtonBuilder()
                .setEmoji('1135038844706762799')
                .setStyle(ButtonStyle.Secondary)
                .setCustomId('right');

              const row = new ActionRowBuilder().addComponents(leftButton, trashButton, rightButton);
              confirmation.update({ embeds: [configEmbed], components: [row] });
            }
          } catch (error) {
            console.log(error);
          }
        } else {
          console.log('aaaa');
        }
      }
    } catch (error) {
      var errorId = generateID(10);
      errorMessage(`Error Id - ${errorId}`);
      console.log(error);
      const errorEmbed = new EmbedBuilder()
        .setColor(config.discord.embeds.red)
        .setTitle('An error occurred')
        .setDescription(
          `Use </report-bug:${
            config.discord.commands['report-bug']
          }> to report it\nError id - ${errorId}\nError Info - \`${error.toString().replaceAll('Error: ', '')}\``
        )
        .setFooter({
          text: `by @kathund | ${config.discord.supportInvite} for support`,
          iconURL: 'https://i.imgur.com/uUuZx2E.png',
        });

      const supportDisc = new ButtonBuilder()
        .setLabel('Support Discord')
        .setURL(config.discord.supportInvite)
        .setStyle(ButtonStyle.Link);

      const row = new ActionRowBuilder().addComponents(supportDisc);

      await interaction.reply({ embeds: [errorEmbed], rows: [row] });
    }
  },
};