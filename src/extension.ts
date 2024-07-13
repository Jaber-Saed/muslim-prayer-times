import * as vscode from 'vscode';
import * as schedule from 'node-schedule';
import { getPrayerTimes, PrayerTimes } from './prayerTimesService';
import player from 'play-sound';

export function activate(context: vscode.ExtensionContext) {
	const provider = new PrayerTimesProvider(context);
	vscode.window.registerTreeDataProvider('prayerTimesView', provider);

	context.subscriptions.push(
		vscode.commands.registerCommand('muslim-prayer-times.refresh', () => {
			provider.refresh();
		}),
		vscode.commands.registerCommand('muslim-prayer-times.setLocation', async () => {
			const location = await vscode.window.showInputBox({
				placeHolder: 'Enter your location as latitude,longitude (e.g., 40.7128,-74.0060)'
			});
			if (location) {
				await vscode.workspace.getConfiguration().update('muslim-prayer-times.location', location, true);
				provider.refresh();
			}
		})
	);
}

export function deactivate() { }

class PrayerTimesProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
	private prayerTimes: PrayerTimes | null = null;
	private location: string | undefined;
	private timeFormat: string | undefined;
	private playAzan: boolean | undefined;
	private azanPlayer: any;

	constructor(private context: vscode.ExtensionContext) {
		this.location = vscode.workspace.getConfiguration().get('muslim-prayer-times.location');
		this.timeFormat = vscode.workspace.getConfiguration().get('muslim-prayer-times.timeFormat');
		this.playAzan = vscode.workspace.getConfiguration().get('muslim-prayer-times.playAzan');
		this.azanPlayer = player();
		this.refresh();
	}

	async refresh() {
		if (!this.location) {
			vscode.window.showErrorMessage('Please set your location to fetch accurate prayer times.');
			return;
		}

		const [latitude, longitude] = this.location.split(',').map(Number);
		this.prayerTimes = await getPrayerTimes(latitude, longitude);
		this.scheduleNotifications();
	}

	private scheduleNotifications() {
		if (this.prayerTimes) {
			Object.entries(this.prayerTimes).forEach(([prayer, time]) => {
				const [hours, minutes] = (time as string).split(':').map(Number);
				const job = schedule.scheduleJob({ hour: hours, minute: minutes }, () => {
					vscode.window.showInformationMessage(`It's time for ${prayer}`);
					if (this.playAzan) {
						this.azanPlayer.play(this.context.asAbsolutePath('media/azan.mp3'), (err: any) => {
							if (err) {
								vscode.window.showErrorMessage('Error playing Azan sound: ' + err.message);
							}
						});
					}
				});
			});
		}
	}

	getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
		return element;
	}

	async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
		if (!this.prayerTimes) {
			await this.refresh();
		}

		const items = [];
		for (const [prayer, time] of Object.entries(this.prayerTimes!)) {
			const displayTime = this.timeFormat === '12-hour' ? convertTo12Hour(time) : time;
			items.push(new vscode.TreeItem(`${prayer}: ${displayTime}`));
		}
		return items;
	}
}

function convertTo12Hour(time: string): string {
	let [hours, minutes] = time.split(':').map(Number);
	const suffix = hours >= 12 ? 'PM' : 'AM';
	hours = ((hours + 11) % 12 + 1);
	return `${hours}:${minutes} ${suffix}`;
}
