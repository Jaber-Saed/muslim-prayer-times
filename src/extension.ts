import * as vscode from 'vscode';
import * as schedule from 'node-schedule';
import { getPrayerTimes, PrayerTimes } from './prayerTimesService';
import player from 'play-sound';
import { translations } from './translations';

let provider: PrayerTimesProvider;

export function activate(context: vscode.ExtensionContext) {
	provider = new PrayerTimesProvider(context);
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
		}),
		vscode.workspace.onDidChangeConfiguration(event => {
			if (event.affectsConfiguration('muslim-prayer-times')) {
				provider.refreshSettings();
				provider.debouncedRefresh();
			}
		})
	);
}

export function deactivate() {
	provider.stopUpdateTimer();
}

class PrayerTimesProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

	private prayerTimes: PrayerTimes | null = null;
	private location: string | undefined;
	private timeFormat: string | undefined;
	private playAzan: boolean | undefined;
	private language: string | undefined;
	private azanPlayer: any;
	private jobs: schedule.Job[] = [];
	private refreshDebounce: NodeJS.Timeout | null = null;
	private updateTimer: NodeJS.Timeout | null = null;

	constructor(private context: vscode.ExtensionContext) {
		this.refreshSettings();
		this.refresh();
	}

	refreshSettings() {
		const config = vscode.workspace.getConfiguration('muslim-prayer-times');
		this.location = config.get('location');
		this.timeFormat = config.get('timeFormat');
		this.playAzan = config.get('playAzan');
		this.language = config.get('language');
		this.azanPlayer = player();
	}

	async refresh() {
		this.refreshSettings();
		if (!this.location) {
			vscode.window.showErrorMessage('Please set your location to fetch accurate prayer times.');
			return;
		}

		const [latitude, longitude] = this.location.split(',').map(Number);
		this.prayerTimes = await getPrayerTimes(latitude, longitude);
		this.scheduleNotifications();
		this._onDidChangeTreeData.fire();
		this.startUpdateTimer();
	}

	public debouncedRefresh() {
		if (this.refreshDebounce) {
			clearTimeout(this.refreshDebounce);
		}
		this.refreshDebounce = setTimeout(() => {
			this.refresh();
		}, 300);
	}

	private scheduleNotifications() {
		this.jobs.forEach(job => job.cancel());
		this.jobs = [];

		if (this.prayerTimes) {
			Object.entries(this.prayerTimes).forEach(([prayer, time]) => {
				const [hours, minutes] = (time as string).split(':').map(Number);
				const job = schedule.scheduleJob({ hour: hours, minute: minutes }, () => {
					vscode.window.showInformationMessage(`It's time for ${translations[this.language!][prayer]}`);
					if (this.playAzan) {
						this.azanPlayer.play(this.context.asAbsolutePath('media/azan.mp3'), (err: any) => {
							if (err) {
								vscode.window.showErrorMessage('Error playing Azan sound: ' + err.message);
							}
						});
					}
				});
				this.jobs.push(job);
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

		const items: vscode.TreeItem[] = [];

		if (this.prayerTimes) {
			const { prayer: nextPrayer, timeRemaining } = getTimeUntilNextPrayer(this.prayerTimes);

			const nextPrayerItem = new vscode.TreeItem(`Next Prayer: ${translations[this.language!][nextPrayer]}`);
			nextPrayerItem.description = `in ${timeRemaining}`;
			nextPrayerItem.iconPath = new vscode.ThemeIcon('clock');
			nextPrayerItem.collapsibleState = vscode.TreeItemCollapsibleState.None;
			items.push(nextPrayerItem);

			items.push(new vscode.TreeItem('─'.repeat(30)));

			const longestPrayerName = Math.max(...Object.keys(this.prayerTimes).map(prayer => translations[this.language!][prayer].length));

			for (const [prayer, time] of Object.entries(this.prayerTimes)) {
				const translatedPrayer = translations[this.language!][prayer];
				const displayTime = this.timeFormat === '12-hour' ? convertTo12Hour(time as string) : time;
				const timeLeft = this.getTimeRemaining(time as string);

				const paddedPrayerName = translatedPrayer.padEnd(longestPrayerName, ' ');
				const item = new vscode.TreeItem(`${paddedPrayerName}  ${displayTime}`);
				item.description = `(${timeLeft} remaining)`;

				if (prayer === nextPrayer) {
					item.iconPath = new vscode.ThemeIcon('arrow-right');
					item.contextValue = 'nextPrayer';
				}

				items.push(item);
			}
			// items.push(new vscode.TreeItem('─'.repeat(30)));
			// items.push(new vscode.TreeItem('{ إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَوْقُوتًا  } '));
		}

		return items;
	}

	public getTimeRemaining(prayerTime: string): string {
		const currentTime = new Date();
		const [hours, minutes] = prayerTime.split(':').map(Number);
		const prayerDate = new Date(currentTime);
		prayerDate.setHours(hours, minutes, 0, 0);

		let diff = (prayerDate.getTime() - currentTime.getTime()) / 1000;
		if (diff < 0) {
			diff += 24 * 60 * 60;
		}

		const hoursRemaining = Math.floor(diff / 3600);
		const minutesRemaining = Math.floor((diff % 3600) / 60);

		return `${hoursRemaining}h ${minutesRemaining}m`;
	}

	startUpdateTimer() {
		if (this.updateTimer) {
			clearInterval(this.updateTimer);
		}
		this.updateTimer = setInterval(() => {
			this._onDidChangeTreeData.fire();
		}, 60000);
	}

	stopUpdateTimer() {
		if (this.updateTimer) {
			clearInterval(this.updateTimer);
			this.updateTimer = null;
		}
	}
}

function getTimeUntilNextPrayer(prayerTimes: PrayerTimes): { prayer: string; timeRemaining: string } {
	const now = new Date();
	const currentTime = now.getHours() * 60 + now.getMinutes();

	let nextPrayer = '';
	let minDiff = Infinity;

	for (const [prayer, time] of Object.entries(prayerTimes)) {
		const [hours, minutes] = (time as string).split(':').map(Number);
		const prayerTime = hours * 60 + minutes;
		let diff = prayerTime - currentTime;

		if (diff < 0) {
			diff += 24 * 60;
		}

		if (diff < minDiff) {
			minDiff = diff;
			nextPrayer = prayer;
		}
	}

	const hours = Math.floor(minDiff / 60);
	const minutes = minDiff % 60;

	return {
		prayer: nextPrayer,
		timeRemaining: `${hours}h ${minutes}m`
	};
}

function convertTo12Hour(time: string): string {
	const [hour, minute] = time.split(':').map(Number);
	const period = hour >= 12 ? 'PM' : 'AM';
	const adjustedHour = hour % 12 || 12;
	return `${adjustedHour}:${minute.toString().padStart(2, '0')} ${period}`;
}