import * as vscode from 'vscode';
import * as schedule from 'node-schedule';
import { getPrayerTimes, PrayerTimes } from './prayerTimesService';

export function activate(context: vscode.ExtensionContext) {
	const provider = new PrayerTimesProvider();
	vscode.window.registerTreeDataProvider('prayerTimesView', provider);

	context.subscriptions.push(
		vscode.commands.registerCommand('prayerTimes.refresh', () => {
			provider.refresh();
		})
	);
}

export function deactivate() { }

class PrayerTimesProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
	private prayerTimes: PrayerTimes | null = null;

	constructor() {
		this.refresh();
	}

	async refresh() {
		const { latitude, longitude } = await this.getLocation();
		this.prayerTimes = await getPrayerTimes(latitude, longitude);
		this.scheduleNotifications();
	}

	private async getLocation() {
		return { latitude: 40.7128, longitude: -74.0060 }; // Mocked location
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

		return [
			new vscode.TreeItem(`Fajr: ${this.prayerTimes!.fajr}`),
			new vscode.TreeItem(`Dhuhr: ${this.prayerTimes!.dhuhr}`),
			new vscode.TreeItem(`Asr: ${this.prayerTimes!.asr}`),
			new vscode.TreeItem(`Maghrib: ${this.prayerTimes!.maghrib}`),
			new vscode.TreeItem(`Isha: ${this.prayerTimes!.isha}`)
		];
	}
}
