import * as vscode from 'vscode';
import * as schedule from 'node-schedule';
import { getPrayerTimes, PrayerTimes } from './prayerTimesService';
import player from 'play-sound';
import { translations } from './translations';

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
	private language: string | undefined;
	private azanPlayer: any;

	constructor(private context: vscode.ExtensionContext) {
		this.location = vscode.workspace.getConfiguration().get('muslim-prayer-times.location');
		this.timeFormat = vscode.workspace.getConfiguration().get('muslim-prayer-times.timeFormat');
		this.playAzan = vscode.workspace.getConfiguration().get('muslim-prayer-times.playAzan');
		this.language = vscode.workspace.getConfiguration().get('muslim-prayer-times.language');
		this.azanPlayer = player();

		this.refresh();
	}

	async refresh() {
		const [latitude, longitude] = this.location!.split(',').map(Number);
		this.prayerTimes = await getPrayerTimes(latitude, longitude);
		this.scheduleNotifications();
		this.refreshTreeView();
	}

	private scheduleNotifications() {
		if (this.prayerTimes) {
			Object.entries(this.prayerTimes).forEach(([prayer, time]) => {
				const [hours, minutes] = (time as string).split(':').map(Number);
				const job = schedule.scheduleJob({ hour: hours, minute: minutes }, () => {
					vscode.window.showInformationMessage(`It's time for ${translations[this.language!][prayer]}`);
					if (this.playAzan) {
						this.azanPlayer.play(vscode.Uri.file(this.context.asAbsolutePath('media/azan.mp3')).fsPath);
					}
				});
			});
		}
	}

	private refreshTreeView() {
		vscode.commands.executeCommand('workbench.view.explorer');
		vscode.commands.executeCommand('prayerTimesView.refresh');
	}

	getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
		return element;
	}

	async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
		if (!this.prayerTimes) {
			await this.refresh();
		}

		return [
			new vscode.TreeItem(`${translations[this.language!].fajr}: ${this.prayerTimes!.fajr}`),
			new vscode.TreeItem(`${translations[this.language!].dhuhr}: ${this.prayerTimes!.dhuhr}`),
			new vscode.TreeItem(`${translations[this.language!].asr}: ${this.prayerTimes!.asr}`),
			new vscode.TreeItem(`${translations[this.language!].maghrib}: ${this.prayerTimes!.maghrib}`),
			new vscode.TreeItem(`${translations[this.language!].isha}: ${this.prayerTimes!.isha}`)
		];
	}
}
