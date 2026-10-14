
import { useEffect, useState } from 'react';
import {
    Alert,
    Keyboard,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Task = {
    id: string;
    title: string;
    completed: boolean;
};

const TASKS_KEY = 'daily-discipline-tasks';
const CYCLE_KEY = 'daily-discipline-cycle';

// Erinnerung startet um 09:00 Uhr.
// Der Tageswechsel findet eine Stunde vorher statt.
const RESET_HOUR = 8;

function getCycleKey(date = new Date()) {
    const cycleStart = new Date(date);
    cycleStart.setHours(RESET_HOUR, 0, 0, 0);

    if (date.getTime() < cycleStart.getTime()) {
        cycleStart.setDate(cycleStart.getDate() - 1);
    }

    return [
        cycleStart.getFullYear(),
        String(cycleStart.getMonth() + 1).padStart(2, '0'),
        String(cycleStart.getDate()).padStart(2, '0'),
    ].join('-');
}

const initialTasks: Task[] = [
    { id: '1', title: 'Nicht smoken', completed: false },
    { id: '2', title: 'Am Portfolio programmieren', completed: false },
    { id: '3', title: '1–2 Stunden programmieren', completed: false },
    { id: '4', title: 'Tagebuch schreiben', completed: false },
    { id: '5', title: 'Sport machen', completed: false },
    { id: '6', title: '10.000 Schritte gehen', completed: false },
];

export default function HomeScreen() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [newTask, setNewTask] = useState('');
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        async function loadTasks() {
            try {
                const savedTasks = await AsyncStorage.getItem(TASKS_KEY);
                const savedCycle = await AsyncStorage.getItem(CYCLE_KEY);
                const currentCycle = getCycleKey();

                let loadedTasks: Task[];

                if (savedTasks === null) {
                    loadedTasks = initialTasks;
                } else {
                    loadedTasks = JSON.parse(savedTasks) as Task[];
                }

                if (savedCycle !== currentCycle) {
                    loadedTasks = loadedTasks.map((task) => ({
                        ...task,
                        completed: false,
                    }));
                }

                setTasks(loadedTasks);

                await AsyncStorage.setItem(
                    TASKS_KEY,
                    JSON.stringify(loadedTasks),
                );
                await AsyncStorage.setItem(CYCLE_KEY, currentCycle);
            } catch (error) {
                console.error('Fehler beim Laden:', error);
                Alert.alert('Fehler', 'Deine Aufgaben konnten nicht geladen werden.');
            } finally {
                setLoaded(true);
            }
        }

        loadTasks();
    }, []);

    useEffect(() => {
        if (!loaded) return;

        AsyncStorage.setItem(TASKS_KEY, JSON.stringify(tasks)).catch(
            console.error,
        );
    }, [tasks, loaded]);

    // Prüft auch dann auf einen neuen Tageszyklus,
    // wenn die App über den Reset-Zeitpunkt hinweg geöffnet bleibt.
    useEffect(() => {
        if (!loaded) return;

        const interval = setInterval(async () => {
            const currentCycle = getCycleKey();
            const savedCycle = await AsyncStorage.getItem(CYCLE_KEY);

            if (savedCycle !== currentCycle) {
                setTasks((currentTasks) =>
                    currentTasks.map((task) => ({
                        ...task,
                        completed: false,
                    })),
                );

                await AsyncStorage.setItem(CYCLE_KEY, currentCycle);
            }
        }, 30_000);

        return () => clearInterval(interval);
    }, [loaded]);

    function toggleTask(id: string) {
        setTasks((currentTasks) =>
            currentTasks.map((task) =>
                task.id === id
                    ? { ...task, completed: !task.completed }
                    : task,
            ),
        );
    }

    function addTask() {
        const title = newTask.trim();

        if (!title) return;

        setTasks((currentTasks) => [
            ...currentTasks,
            {
                id: `${Date.now()}-${Math.random()}`,
                title,
                completed: false,
            },
        ]);

        setNewTask('');
        Keyboard.dismiss();
    }

    function deleteTask(id: string) {
        Alert.alert('Aufgabe löschen?', 'Diese Aufgabe wird dauerhaft entfernt.', [
            { text: 'Abbrechen', style: 'cancel' },
            {
                text: 'Löschen',
                style: 'destructive',
                onPress: () =>
                    setTasks((currentTasks) =>
                        currentTasks.filter((task) => task.id !== id),
                    ),
            },
        ]);
    }

    const completedCount = tasks.filter((task) => task.completed).length;
    const allDone = tasks.length > 0 && completedCount === tasks.length;
    const progress =
        tasks.length === 0 ? 0 : completedCount / tasks.length;

    if (!loaded) {
        return (
            <SafeAreaView style={styles.container}>
                <Text style={styles.loading}>Daily Discipline lädt...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={styles.eyebrow}>DEIN TAG. DEINE VERANTWORTUNG.</Text>
                <Text style={styles.title}>Daily Discipline</Text>
                <Text style={styles.subtitle}>
                    Kleine Schritte. Jeden Tag.
                </Text>

                <View style={styles.summary}>
                    <Text style={styles.summaryLabel}>DEIN FORTSCHRITT</Text>
                    <View style={styles.progressRow}>
                        <Text style={styles.progressNumber}>
                            {completedCount}/{tasks.length}
                        </Text>
                        <Text style={styles.progressPercent}>
                            {Math.round(progress * 100)}%
                        </Text>
                    </View>

                    <View style={styles.progressBackground}>
                        <View
                            style={[styles.progressFill, { width: `${progress * 100}%` }]}
                        />
                    </View>

                    <Text style={styles.summaryMessage}>
                        {allDone
                            ? 'Alles erledigt. Stark durchgezogen! 🔥'
                            : 'Mach den nächsten Haken. Du schaffst das.'}
                    </Text>
                </View>

                <Text style={styles.sectionTitle}>DEINE TÄGLICHEN ZIELE</Text>

                {tasks.map((task) => (
                    <View key={task.id} style={styles.taskRow}>
                        <Pressable
                            onPress={() => toggleTask(task.id)}
                            style={styles.taskMain}
                        >
                            <View
                                style={[
                                    styles.checkbox,
                                    task.completed && styles.checkboxDone,
                                ]}
                            >
                                {task.completed && (
                                    <Text style={styles.checkmark}>✓</Text>
                                )}
                            </View>

                            <Text
                                style={[
                                    styles.taskText,
                                    task.completed && styles.taskTextDone,
                                ]}
                            >
                                {task.title}
                            </Text>
                        </Pressable>

                        <Pressable
                            accessibilityLabel={`Aufgabe ${task.title} löschen`}
                            onPress={() => deleteTask(task.id)}
                            hitSlop={10}
                            style={styles.deleteButton}
                        >
                            <Text style={styles.deleteText}>×</Text>
                        </Pressable>
                    </View>
                ))}

                <Text style={styles.sectionTitle}>NEUES ZIEL</Text>

                <View style={styles.addRow}>
                    <TextInput
                        value={newTask}
                        onChangeText={setNewTask}
                        onSubmitEditing={addTask}
                        placeholder="Was willst du täglich schaffen?"
                        placeholderTextColor="#777777"
                        returnKeyType="done"
                        style={styles.input}
                    />

                    <Pressable onPress={addTask} style={styles.addButton}>
                        <Text style={styles.addButtonText}>+</Text>
                    </Pressable>
                </View>

                <Text style={styles.footer}>
                    Neuer Tageszyklus: täglich um {String(RESET_HOUR).padStart(2, '0')}:00 Uhr
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    content: {
        padding: 22,
        paddingTop: 36,
        paddingBottom: 48,
    },
    loading: {
        color: '#ffffff',
        textAlign: 'center',
        marginTop: 80,
    },
    eyebrow: {
        color: '#a78bfa',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 2,
        marginBottom: 10,
    },
    title: {
        color: '#ffffff',
        fontSize: 34,
        fontWeight: '900',
    },
    subtitle: {
        color: '#999999',
        fontSize: 15,
        marginTop: 8,
        marginBottom: 28,
    },
    summary: {
        backgroundColor: '#202020',
        borderRadius: 18,
        padding: 20,
        marginBottom: 30,
    },
    summaryLabel: {
        color: '#aaaaaa',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.5,
    },
    progressRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 14,
    },
    progressNumber: {
        color: '#ffffff',
        fontSize: 32,
        fontWeight: '800',
    },
    progressPercent: {
        color: '#a78bfa',
        fontSize: 20,
        fontWeight: '800',
    },
    progressBackground: {
        height: 8,
        borderRadius: 10,
        backgroundColor: '#393939',
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#a78bfa',
        borderRadius: 10,
    },
    summaryMessage: {
        color: '#bbbbbb',
        fontSize: 13,
        marginTop: 14,
    },
    sectionTitle: {
        color: '#999999',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1.5,
        marginBottom: 12,
    },
    taskRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#202020',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 15,
        marginBottom: 9,
    },
    taskMain: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderWidth: 2,
        borderColor: '#666666',
        borderRadius: 7,
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxDone: {
        backgroundColor: '#a78bfa',
        borderColor: '#a78bfa',
    },
    checkmark: {
        color: '#121212',
        fontWeight: '900',
        fontSize: 16,
    },
    taskText: {
        color: '#eeeeee',
        fontSize: 14,
        flexShrink: 1,
    },
    taskTextDone: {
        color: '#777777',
        textDecorationLine: 'line-through',
    },
    deleteButton: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        marginLeft: 8,
    },
    deleteText: {
        color: '#888888',
        fontSize: 25,
    },
    addRow: {
        flexDirection: 'row',
        gap: 10,
    },
    input: {
        flex: 1,
        backgroundColor: '#202020',
        color: '#ffffff',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 13,
        fontSize: 14,
    },
    addButton: {
        width: 48,
        backgroundColor: '#a78bfa',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addButtonText: {
        color: '#121212',
        fontSize: 28,
        fontWeight: '700',
    },
    footer: {
        color: '#777777',
        textAlign: 'center',
        fontSize: 12,
        marginTop: 28,
    },
});
