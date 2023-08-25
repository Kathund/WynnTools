const { ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle } = require('discord.js');
const { writeAt, toFixed, generateID, blacklistCheck } = require('../helperFunctions.js');
const { commandMessage, errorMessage } = require('../logger.js');
const config = require('../../config.json');
const fs = require('fs');

module.exports = {
  name: 'InteractionCreate',
  async execute(interaction) {
    try {
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try {
          if (interaction.user.discriminator == '0') {
            commandMessage(
              `${interaction.user.username} (${interaction.user.id}) ran command ${interaction.commandName}`
            );
          } else {
            commandMessage(
              `${interaction.user.username}#${interaction.user.discriminator} (${interaction.user.id}) ran command ${interaction.commandName}`
            );
          }
        } catch (error) {
          console.log(error);
        }
        try {
          if (!config.discord.channels.noCommandTracking.includes(interaction.channel.id)) {
            var userData = JSON.parse(fs.readFileSync('data/userData.json'));
            let data;
            if (userData[interaction.user.id]) {
              data = {
                commandsRun: userData[interaction.user.id].commandsRun + 1,
                firstCommand: userData[interaction.user.id].firstCommand,
                lastUpdated: toFixed(new Date().getTime() / 1000, 0),
                commands: userData[interaction.user.id].commands,
              };
              const commands = data.commands;
              if (commands[interaction.commandName]) {
                commands[interaction.commandName]++;
              } else {
                commands[interaction.commandName] = 1;
              }
              await writeAt('data/userData.json', interaction.user.id, data);
            } else {
              data = {
                commandsRun: 1,
                firstCommand: toFixed(new Date().getTime() / 1000, 0),
                lastUpdated: toFixed(new Date().getTime() / 1000, 0),
                commands: { [interaction.commandName]: 1 },
              };
              await writeAt('data/userData.json', interaction.user.id, data);
            }
          }
        } catch (error) {
          console.log(error);
        }
        try {
          var blacklistTest = await blacklistCheck(interaction.user.id);
          if (blacklistTest) {
            const blacklisted = new EmbedBuilder()
              .setColor(config.discord.embeds.red)
              .setDescription('You are blacklisted')
              .setFooter({
                text: `by @kathund | ${config.discord.supportInvite} for support`,
                iconURL: config.other.logo,
              });
            return await interaction.reply({ embeds: [blacklisted], ephemeral: true });
          }
          await command.execute(interaction);
        } catch (error) {
          console.error(error);
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
              content: 'There was an error while executing this command!',
              ephemeral: true,
            });
          } else {
            await interaction.reply({
              content: 'There was an error while executing this command!',
              ephemeral: true,
            });
          }
        }
      }
      if (interaction.isButton()) {
        try {
          if (interaction.customId.includes('setupGuideFunFacts')) {
            const setupGuideCommand = interaction.client.commands.get('fun-facts');
            if (setupGuideCommand === undefined) {
              throw new Error(
                'Setup guide command is missing. Please make a bug report or join the support server and make a ticket'
              );
            }
            await setupGuideCommand.execute(interaction);
          }
        } catch (error) {
          console.error(error);
          await interaction.followUp({
            content: 'There was an error while executing this command!',
            ephemeral: true,
          });
          var errorId = generateID(10);
          errorMessage(`Error Id - ${errorId}`);
          console.log(error);
          const errorEmbed = new EmbedBuilder()
            .setColor(config.discord.embeds.red)
            .setTitle('An error occurred')
            .setDescription(
              `Use </report-bug:${
                config.discord.commands['report-bug']
              }> to report it\nError id - ${errorId}\nError Info - \`${error
                .toString()
                .replaceAll('Error: ', '')}\``
            )
            .setFooter({
              text: `by @kathund | ${config.discord.supportInvite} for support`,
              iconURL: config.other.logo,
            });
          const supportDisc = new ButtonBuilder()
            .setLabel('Support Discord')
            .setURL(config.discord.supportInvite)
            .setStyle(ButtonStyle.Link);
          const row = new ActionRowBuilder().addComponents(supportDisc);
          await interaction.reply({ embeds: [errorEmbed], rows: [row], ephemeral: true });
        }
      }
    } catch (error) {
      console.log(error);
    }
  },
};