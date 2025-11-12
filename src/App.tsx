import { useState, useEffect } from 'react';
import { Coins, TrendingUp, BookOpen, ArrowLeft, Trophy, Star, Target, ShoppingBag, User, Gift } from 'lucide-react';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { BudgetSimulator } from './components/BudgetSimulator';
import { Quiz } from './components/Quiz';
import { Progress } from './components/ui/progress';
import { Shop } from './components/Shop';
import { Input } from './components/ui/input';

type Screen = 'login' | 'home' | 'quiz' | 'budget' | 'stats' | 'quiz-select' | 'shop' | 'daily';
type QuizCategory = 'basics' | 'saving' | 'budget' | 'investing' | 'mixed';

interface UserStats {
  username: string;
  avatar: string;
  coins: number;
  totalQuizzes: number;
  perfectScores: number;
  bestStreak: number;
  level: number;
  xp: number;
  categoryScores: Record<QuizCategory, { played: number; avgScore: number }>;
  achievements: string[];
  purchasedItems: string[];
  theme: string;
  dailyStreak: number;
  lastLogin: string;
  dailyTasksCompleted: string[];
}

const THEMES = {
  default: { primary: 'from-purple-500 to-pink-500', name: 'Фиолетовый' },
  ocean: { primary: 'from-blue-500 to-cyan-500', name: 'Океан' },
  sunset: { primary: 'from-orange-500 to-red-500', name: 'Закат' },
  forest: { primary: 'from-green-500 to-emerald-500', name: 'Лес' },
  gold: { primary: 'from-yellow-500 to-amber-500', name: 'Золото' },
  night: { primary: 'from-indigo-900 to-purple-900', name: 'Ночь' },
};

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [selectedCategory, setSelectedCategory] = useState<QuizCategory>('mixed');
  const [stats, setStats] = useState<UserStats | null>(null);
  const [username, setUsername] = useState('');
  const [loginError, setLoginError] = useState('');

  // Проверка при загрузке
  useEffect(() => {
    const saved = localStorage.getItem('finansy-stats');
    if (saved) {
      const userData = JSON.parse(saved);
      setStats(userData);
      setScreen('home');
      checkDailyStreak(userData);
    }
  }, []);

  // Сохранение статистики
  useEffect(() => {
    if (stats) {
      localStorage.setItem('finansy-stats', JSON.stringify(stats));
    }
  }, [stats]);

  const checkDailyStreak = (userData: UserStats) => {
    const today = new Date().toDateString();
    const lastLogin = new Date(userData.lastLogin || today).toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    if (lastLogin !== today) {
      if (lastLogin === yesterday) {
        // Продолжение серии
        setStats({
          ...userData,
          dailyStreak: userData.dailyStreak + 1,
          lastLogin: today,
          dailyTasksCompleted: []
        });
      } else {
        // Серия прервана
        setStats({
          ...userData,
          dailyStreak: 1,
          lastLogin: today,
          dailyTasksCompleted: []
        });
      }
    }
  };

  const handleLogin = () => {
    if (username.trim().length < 3) {
      setLoginError('Имя должно быть минимум 3 символа');
      return;
    }

    const newStats: UserStats = {
      username: username.trim(),
      avatar: '👤',
      coins: 100, // Стартовые монеты
      totalQuizzes: 0,
      perfectScores: 0,
      bestStreak: 0,
      level: 1,
      xp: 0,
      categoryScores: {
        basics: { played: 0, avgScore: 0 },
        saving: { played: 0, avgScore: 0 },
        budget: { played: 0, avgScore: 0 },
        investing: { played: 0, avgScore: 0 },
        mixed: { played: 0, avgScore: 0 }
      },
      achievements: [],
      purchasedItems: [],
      theme: 'default',
      dailyStreak: 1,
      lastLogin: new Date().toDateString(),
      dailyTasksCompleted: []
    };

    setStats(newStats);
    setScreen('home');
  };

  const handleQuizComplete = (score: number, total: number, category: QuizCategory) => {
    if (!stats) return;

    const percentage = (score / total) * 100;
    let coinsEarned = score * 10;
    let xpEarned = score * 5;

    // Бонусы
    if (percentage === 100) {
      coinsEarned += 50;
      xpEarned += 25;
    } else if (percentage >= 80) {
      coinsEarned += 20;
      xpEarned += 10;
    }

    // Бонус за ежедневную серию
    if (stats.dailyStreak >= 3) {
      coinsEarned += stats.dailyStreak * 5;
    }

    // Обновление статистики категории
    const categoryStats = stats.categoryScores[category];
    const newAvgScore = ((categoryStats.avgScore * categoryStats.played) + percentage) / (categoryStats.played + 1);

    const newStats = {
      ...stats,
      coins: stats.coins + coinsEarned,
      totalQuizzes: stats.totalQuizzes + 1,
      perfectScores: percentage === 100 ? stats.perfectScores + 1 : stats.perfectScores,
      xp: stats.xp + xpEarned,
      categoryScores: {
        ...stats.categoryScores,
        [category]: {
          played: categoryStats.played + 1,
          avgScore: newAvgScore
        }
      }
    };

    // Расчет уровня
    newStats.level = Math.floor(newStats.xp / 100) + 1;

    // Проверка достижений
    checkAchievements(newStats);

    // Проверка ежедневных заданий
    checkDailyTasks(newStats, 'quiz');

    setStats(newStats);
    setScreen('home');
  };

  const handleBudgetComplete = () => {
    if (!stats) return;
    
    const coinsEarned = 75;
    const xpEarned = 30;

    const newStats = {
      ...stats,
      coins: stats.coins + coinsEarned,
      xp: stats.xp + xpEarned,
      level: Math.floor((stats.xp + xpEarned) / 100) + 1
    };

    checkDailyTasks(newStats, 'budget');
    setStats(newStats);
    setScreen('home');
  };

  const checkDailyTasks = (newStats: UserStats, taskType: string) => {
    const tasks = ['quiz', 'budget', 'perfect'];
    const completed = newStats.dailyTasksCompleted || [];
    if (!completed.includes(taskType) && tasks.includes(taskType)) {
      newStats.dailyTasksCompleted = [...completed, taskType];
      newStats.coins += 25; // Бонус за ежедневное задание
    }
  };

  const checkAchievements = (newStats: UserStats) => {
    const achievements: string[] = [...newStats.achievements];

    const toCheck = [
      { id: 'first-quiz', condition: newStats.totalQuizzes === 1 },
      { id: 'quiz-expert', condition: newStats.totalQuizzes === 10 },
      { id: 'quiz-master', condition: newStats.totalQuizzes === 50 },
      { id: 'perfectionist', condition: newStats.perfectScores === 5 },
      { id: 'perfect-10', condition: newStats.perfectScores === 10 },
      { id: 'rich', condition: newStats.coins >= 500 },
      { id: 'millionaire', condition: newStats.coins >= 1000 },
      { id: 'mega-rich', condition: newStats.coins >= 2000 },
      { id: 'level-5', condition: newStats.level >= 5 },
      { id: 'level-10', condition: newStats.level >= 10 },
      { id: 'streak-7', condition: newStats.dailyStreak >= 7 },
      { id: 'streak-30', condition: newStats.dailyStreak >= 30 },
    ];

    toCheck.forEach(({ id, condition }) => {
      if (condition && !achievements.includes(id)) {
        achievements.push(id);
        newStats.coins += 50; // Бонус за достижение
      }
    });

    newStats.achievements = achievements;
  };

  const handlePurchase = (itemId: string, cost: number) => {
    if (!stats || stats.coins < cost) return;

    setStats({
      ...stats,
      coins: stats.coins - cost,
      purchasedItems: [...stats.purchasedItems, itemId]
    });
  };

  const handleThemeChange = (theme: string) => {
    if (!stats) return;
    setStats({ ...stats, theme });
  };

  const handleAvatarChange = (avatar: string) => {
    if (!stats) return;
    setStats({ ...stats, avatar });
  };

  if (!stats) {
    // Экран входа
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-500 to-pink-500 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm p-8">
          <div className="text-center mb-6">
            <div className="inline-block bg-gradient-to-br from-purple-500 to-pink-500 rounded-full p-4 mb-4">
              <Coins className="w-16 h-16 text-white" />
            </div>
            <h1 className="mb-2">ФинансыPRO</h1>
            <p className="text-muted-foreground">Добро пожаловать! Начни свой путь к финансовой грамотности</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Введи свое имя</label>
              <Input
                placeholder="Например: Алексей"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setLoginError('');
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                className="text-center"
              />
              {loginError && <p className="text-sm text-red-600 mt-2">{loginError}</p>}
            </div>

            <Button 
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              onClick={handleLogin}
            >
              Начать обучение
            </Button>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
              <p className="font-medium mb-2">🎁 Стартовый бонус:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• 100 монет на старте</li>
                <li>• Доступ ко всем категориям</li>
                <li>• Система достижений</li>
                <li>• Магазин тем и аватаров</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const currentTheme = THEMES[stats.theme as keyof typeof THEMES] || THEMES.default;
  const xpToNextLevel = (stats.level * 100) - stats.xp;
  const xpProgress = ((stats.xp % 100) / 100) * 100;

  // Домашний экран
  if (screen === 'home') {
    const dailyTasks = [
      { id: 'quiz', name: 'Пройди 1 квиз', reward: 25, completed: stats.dailyTasksCompleted?.includes('quiz') || false, icon: '📝' },
      { id: 'budget', name: 'Используй симулятор', reward: 25, completed: stats.dailyTasksCompleted?.includes('budget') || false, icon: '💰' },
      { id: 'perfect', name: 'Получи 100%', reward: 25, completed: stats.dailyTasksCompleted?.includes('perfect') || false, icon: '⭐' },
    ];

    return (
      <div className={`min-h-screen bg-gradient-to-b ${currentTheme.primary}`}>
        <div className="mx-auto max-w-md min-h-screen p-6 space-y-4">
          {/* Профиль */}
          <Card className="bg-white/95 backdrop-blur-sm p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-4xl">{stats.avatar}</div>
              <div className="flex-1">
                <h2 className="font-medium">{stats.username}</h2>
                <p className="text-sm text-muted-foreground">Уровень {stats.level}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setScreen('shop')}
              >
                <ShoppingBag className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-yellow-50 rounded-lg p-2 text-center">
                <Coins className="w-5 h-5 text-yellow-600 mx-auto mb-1" />
                <p className="text-xl font-medium">{stats.coins}</p>
                <p className="text-xs text-muted-foreground">Монет</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-2 text-center">
                <Gift className="w-5 h-5 text-orange-600 mx-auto mb-1" />
                <p className="text-xl font-medium">{stats.dailyStreak}</p>
                <p className="text-xs text-muted-foreground">Дней подряд</p>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>XP: {stats.xp % 100}/100</span>
                <span>{xpToNextLevel} до уровня {stats.level + 1}</span>
              </div>
              <Progress value={xpProgress} className="h-2" />
            </div>
          </Card>

          {/* Ежедневные задания */}
          <Card className="bg-white/95 backdrop-blur-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Ежедневные задания</h3>
              <Badge variant="outline">{(stats.dailyTasksCompleted || []).length}/3</Badge>
            </div>
            <div className="space-y-2">
              {dailyTasks.map(task => (
                <div 
                  key={task.id}
                  className={`flex items-center justify-between p-2 rounded-lg ${
                    task.completed ? 'bg-green-50' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{task.icon}</span>
                    <span className="text-sm">{task.name}</span>
                  </div>
                  {task.completed ? (
                    <Badge className="bg-green-500">✓</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">+{task.reward}</Badge>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Статистика */}
          <div className="grid grid-cols-3 gap-2">
            <Card className="bg-white/95 backdrop-blur-sm p-3 text-center">
              <Trophy className="w-5 h-5 text-yellow-600 mx-auto mb-1" />
              <p className="text-lg">{stats.totalQuizzes}</p>
              <p className="text-xs text-muted-foreground">Квизов</p>
            </Card>
            <Card className="bg-white/95 backdrop-blur-sm p-3 text-center">
              <Star className="w-5 h-5 text-purple-600 mx-auto mb-1" />
              <p className="text-lg">{stats.perfectScores}</p>
              <p className="text-xs text-muted-foreground">Идеально</p>
            </Card>
            <Card className="bg-white/95 backdrop-blur-sm p-3 text-center">
              <Target className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <p className="text-lg">{stats.achievements.length}</p>
              <p className="text-xs text-muted-foreground">Награды</p>
            </Card>
          </div>

          {/* Кнопки меню */}
          <div className="space-y-3">
            <Button
              className="w-full h-20 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white justify-start px-6"
              onClick={() => setScreen('quiz-select')}
            >
              <div className="flex items-center gap-4">
                <BookOpen className="w-8 h-8" />
                <div className="text-left">
                  <div>Квиз по финансам</div>
                  <div className="text-xs text-white/80">Выбери категорию и проверь знания</div>
                </div>
              </div>
            </Button>

            <Button
              className="w-full h-20 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white justify-start px-6"
              onClick={() => setScreen('budget')}
            >
              <div className="flex items-center gap-4">
                <TrendingUp className="w-8 h-8" />
                <div className="text-left">
                  <div>Симулятор Бюджета</div>
                  <div className="text-xs text-white/80">Практикуй управление финансами</div>
                </div>
              </div>
            </Button>

            <div className="grid grid-cols-2 gap-3">
              <Button
                className="h-16 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white flex-col"
                onClick={() => setScreen('stats')}
              >
                <Trophy className="w-6 h-6 mb-1" />
                <span className="text-sm">Статистика</span>
              </Button>
              <Button
                className="h-16 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white flex-col"
                onClick={() => setScreen('shop')}
              >
                <ShoppingBag className="w-6 h-6 mb-1" />
                <span className="text-sm">Магазин</span>
              </Button>
            </div>
          </div>

          {/* Совет дня */}
          <Card className="bg-white/90 backdrop-blur-sm p-4 border-2 border-yellow-400">
            <p className="text-sm mb-1">💡 Совет дня</p>
            <p className="text-xs text-muted-foreground">
              {[
                'Откладывай 10% с каждого дохода - это привычка богатых людей!',
                'Инвестируй в свое образование - это луч��ая инвестиция!',
                'Не храни все деньги в одном месте - диверсифицируй!',
                'Следи за мелкими расходами - они складываются в большие суммы!',
                'Установи финансовые цели на год и следуй им!',
                'Начни инвестировать рано - время твой лучший союзник!'
              ][new Date().getDay()]}
            </p>
          </Card>
        </div>
      </div>
    );
  }

  // Остальные экраны с правильной темой
  const screenContent = () => {
    switch (screen) {
      case 'quiz-select':
        return <QuizSelect />;
      case 'quiz':
        return <Quiz category={selectedCategory} onComplete={(score, total) => handleQuizComplete(score, total, selectedCategory)} onBack={() => setScreen('quiz-select')} />;
      case 'budget':
        return (
          <>
            <div className="bg-white/10 backdrop-blur-sm p-4">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => setScreen('home')}>
                <ArrowLeft className="w-6 h-6" />
              </Button>
            </div>
            <BudgetSimulator onComplete={handleBudgetComplete} />
          </>
        );
      case 'stats':
        return <StatsScreen />;
      case 'shop':
        return <Shop stats={stats} onPurchase={handlePurchase} onThemeChange={handleThemeChange} onAvatarChange={handleAvatarChange} onBack={() => setScreen('home')} />;
      default:
        return null;
    }
  };

  function QuizSelect() {
    const categories = [
      { id: 'mixed' as QuizCategory, name: 'Все темы', icon: '🎲', desc: '10 случайных вопросов', color: 'from-purple-500 to-pink-500' },
      { id: 'basics' as QuizCategory, name: 'Основы финансов', icon: '💰', desc: 'Базовые понятия', color: 'from-blue-500 to-cyan-500' },
      { id: 'saving' as QuizCategory, name: 'Сбережения', icon: '🏦', desc: 'Как копить деньги', color: 'from-green-500 to-emerald-500' },
      { id: 'budget' as QuizCategory, name: 'Бюджет', icon: '📊', desc: 'Планирование расходов', color: 'from-orange-500 to-red-500' },
      { id: 'investing' as QuizCategory, name: 'Инвестиции', icon: '📈', desc: 'Заставь деньги работать', color: 'from-yellow-500 to-amber-500' },
    ];

    return (
      <>
        <div className="bg-white/10 backdrop-blur-sm p-4 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => setScreen('home')}>
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div>
              <h2 className="text-white">Выбери категорию</h2>
              <p className="text-white/80 text-sm">Каждая категория - это новые знания</p>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {categories.map(cat => {
            const catStats = stats!.categoryScores[cat.id];
            return (
              <Card key={cat.id} className="p-4 bg-white/95 backdrop-blur-sm cursor-pointer hover:scale-[1.02] transition-all"
                onClick={() => { setSelectedCategory(cat.id); setScreen('quiz'); }}>
                <div className="flex items-start gap-4">
                  <div className={`text-4xl p-3 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center`}>
                    <span className="text-3xl">{cat.icon}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium mb-1">{cat.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{cat.desc}</p>
                    {catStats.played > 0 && (
                      <div className="flex gap-2">
                        <Badge variant="secondary" className="text-xs">Пройдено: {catStats.played}</Badge>
                        <Badge variant="outline" className="text-xs">Средний балл: {catStats.avgScore.toFixed(0)}%</Badge>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </>
    );
  }

  function StatsScreen() {
    const achievementsList = [
      { id: 'first-quiz', name: 'Первый шаг', desc: 'Пройди первый квиз', icon: '🎯' },
      { id: 'quiz-expert', name: 'Эксперт', desc: 'Пройди 10 квизов', icon: '🏆' },
      { id: 'quiz-master', name: 'Мастер', desc: 'Пройди 50 квизов', icon: '👑' },
      { id: 'perfectionist', name: 'Перфекционист', desc: '5 идеальных результатов', icon: '⭐' },
      { id: 'perfect-10', name: 'Безупречный', desc: '10 идеальных результатов', icon: '✨' },
      { id: 'rich', name: 'Богач', desc: 'Накопи 500 монет', icon: '💰' },
      { id: 'millionaire', name: 'Миллионер', desc: 'Накопи 1000 монет', icon: '💎' },
      { id: 'mega-rich', name: 'Мега-богач', desc: 'Накопи 2000 монет', icon: '👑' },
      { id: 'level-5', name: '��астер', desc: 'Достигни 5 уровня', icon: '🌟' },
      { id: 'level-10', name: 'Легенда', desc: 'Достигни 10 уровня', icon: '🔥' },
      { id: 'streak-7', name: 'Неделя', desc: '7 дней подряд', icon: '📅' },
      { id: 'streak-30', name: 'Месяц', desc: '30 дней подряд', icon: '📆' },
    ];

    return (
      <>
        <div className="bg-white/10 backdrop-blur-sm p-4 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => setScreen('home')}>
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div>
              <h2 className="text-white">Твоя статистика</h2>
              <p className="text-white/80 text-sm">Достижения и результаты</p>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <Card className="bg-white/95 backdrop-blur-sm p-4">
            <h3 className="text-sm mb-3">Общая статистика</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl mb-1">{stats!.totalQuizzes}</p>
                <p className="text-xs text-muted-foreground">Всего квизов</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl mb-1">{stats!.perfectScores}</p>
                <p className="text-xs text-muted-foreground">Идеальных</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl mb-1">{stats!.level}</p>
                <p className="text-xs text-muted-foreground">Уровень</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl mb-1">{stats!.coins}</p>
                <p className="text-xs text-muted-foreground">Монет</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm p-4">
            <h3 className="text-sm mb-3">Достижения ({stats!.achievements.length}/{achievementsList.length})</h3>
            <div className="space-y-2">
              {achievementsList.map(achievement => {
                const unlocked = stats!.achievements.includes(achievement.id);
                return (
                  <div key={achievement.id} className={`flex items-center gap-3 p-3 rounded-lg ${
                    unlocked ? 'bg-gradient-to-r from-yellow-50 to-amber-50' : 'bg-gray-50 opacity-60'
                  }`}>
                    <div className={`text-3xl ${!unlocked && 'grayscale'}`}>{achievement.icon}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{achievement.name}</p>
                      <p className="text-xs text-muted-foreground">{achievement.desc}</p>
                    </div>
                    {unlocked && <Badge className="bg-green-500">✓</Badge>}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b ${currentTheme.primary}`}>
      <div className="mx-auto max-w-md min-h-screen">
        {screenContent()}
      </div>
    </div>
  );
}