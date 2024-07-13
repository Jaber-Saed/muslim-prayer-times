import * as vscode from 'vscode';
import * as schedule from 'node-schedule';
import { getPrayerTimes, PrayerTimes } from './prayerTimesService';

export function activate(context: vscode.ExtensionContext) {
	const provider = new PrayerTimesProvider(context);
	vscode.window.registerTreeDataProvider('prayerTimesView', provider);

	context.subscriptions.push(
		vscode.commands.registerCommand('muslim-prayer-times.refresh', () => {
			provider.refresh();
		}),
		vscode.commands.registerCommand('muslim-prayer-times.setLocation', async () => {
			await vscode.workspace.getConfiguration().update('muslim-prayer-times.location', await vscode.window.showInputBox({
				placeHolder: 'Enter your location as latitude,longitude (e.g., 40.7128,-74.0060)'
			}), true);
			provider.refresh();
		})
	);
}

export function deactivate() { }

class PrayerTimesProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
	private prayerTimes: PrayerTimes | null = null;
	private location: string | undefined;
	private timeFormat: string | undefined;

	constructor(private context: vscode.ExtensionContext) {
		this.location = vscode.workspace.getConfiguration().get('muslim-prayer-times.location');
		this.timeFormat = vscode.workspace.getConfiguration().get('muslim-prayer-times.timeFormat');
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

		const timeSuffix = this.timeFormat === '12-hour' ? ' AM/PM' : '';
		return [
			new vscode.TreeItem(`Fajr: ${this.prayerTimes!.fajr}${timeSuffix}`),
			new vscode.TreeItem(`Dhuhr: ${this.prayerTimes!.dhuhr}${timeSuffix}`),
			new vscode.TreeItem(`Asr: ${this.prayerTimes!.asr}${timeSuffix}`),
			new vscode.TreeItem(`Maghrib: ${this.prayerTimes!.maghrib}${timeSuffix}`),
			new vscode.TreeItem(`Isha: ${this.prayerTimes!.isha}${timeSuffix}`)
		];
	}
}
