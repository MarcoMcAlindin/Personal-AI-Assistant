import { test, expect } from '@playwright/test';

// Define the absolute OLED Black palette required by the Figma design
const OLED_PALETTE = {
  bgPrimary: 'rgb(0, 0, 0)',
  bgSecondary: 'rgb(24, 24, 27)',
  accentPrimary: 'rgb(0, 212, 255)',
  textPrimary: 'rgb(250, 250, 250)',
};

test.describe('Full Application Audit (Web & Mobile Viewports)', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard base URL
    await page.goto('/');
  });

  test('1. Verify OLED Theme & Global Layout', async ({ page }) => {
    // Check main body background color (OLED Black)
    const body = page.locator('body');
    await expect(body).toHaveCSS('background-color', OLED_PALETTE.bgPrimary);
    
    // Check Sidebar/Navbar exists
    const navBar = page.getByRole('navigation');
    await expect(navBar).toBeVisible();

    // Verify presence of all major Navigation Links inside navbar
    const links = ['AI Chat', 'Tech Feed', 'Email', 'Health', 'Planner'];
    for (const linkText of links) {
      const link = navBar.getByRole('link', { name: new RegExp(linkText, 'i') });
      await expect(link).toBeVisible();
    }
  });

  test('2. Verify Chat Screen Functionality', async ({ page }) => {
    const navBar = page.getByRole('navigation');
    await navBar.getByRole('link', { name: /AI Chat/i }).click();

    await expect(page).toHaveURL(/.*chat/);
    
    // Check VLLM Status Indicators
    const statusChip = page.getByTestId('vllm-status');
    await expect(statusChip).toBeVisible();

    // Verify Chat Input and Send Button
    const messageInput = page.getByPlaceholder(/Ask SuperCyan anything/i);
    const sendButton = page.getByRole('button', { name: /send/i });
    
    await expect(messageInput).toBeVisible();
    await expect(sendButton).toBeVisible();
    
    // We will not actually send a message here to avoid polluting DB or hitting real LLMs,
    // but we verified the elements are fully rendered and interactive.
    await expect(messageInput).toBeEnabled();
  });

  test('3. Verify Feeds Screen (Tech & Concerts)', async ({ page }) => {
    const navBar = page.getByRole('navigation');
    
    // Test Tech Feeds
    await navBar.getByRole('link', { name: /Tech Feed/i }).click();
    await expect(page).toHaveURL(/.*feeds/);
    
    // Check for the refresh button and feeds container
    const feedHeader = page.getByRole('heading', { level: 1, name: /Vibe Feeds/i });
    await expect(feedHeader).toBeVisible();

    // Test Concert Feeds via Tabs
    const concertsTab = page.getByRole('button', { name: 'Concerts' });
    await concertsTab.click();
    
    const concertsHeader = page.getByRole('heading', { level: 2, name: /Scotland Concerts/i });
    await expect(concertsHeader).toBeVisible();
  });

  test('4. Verify Health Metrics Screen', async ({ page }) => {
    const navBar = page.getByRole('navigation');
    await navBar.getByRole('link', { name: /Health/i }).click();
    await expect(page).toHaveURL(/.*health/);

    const healthHeader = page.getByRole('heading', { level: 1, name: /Health & Intelligence/i });
    await expect(healthHeader).toBeVisible();

    // Verify Sync Button / Text
    const syncText = page.getByText(/Live Sync: Samsung Watch/i);
    await expect(syncText).toBeVisible();
  });

  test('5. Verify Task Planner Screen', async ({ page }) => {
    const navBar = page.getByRole('navigation');
    await navBar.getByRole('link', { name: /Planner/i }).click();
    await expect(page).toHaveURL(/.*planner/);

    const plannerHeader = page.getByRole('heading', { level: 1, name: /Daily Planner/i });
    await expect(plannerHeader).toBeVisible();

    // Verify "Add Task" button or input
    const addTaskBtn = page.getByRole('button', { name: /Add Task/i });
    await expect(addTaskBtn).toBeVisible();
  });

  test('6. Verify Email Client Screen', async ({ page }) => {
    const navBar = page.getByRole('navigation');
    await navBar.getByRole('link', { name: /Email/i }).click();
    await expect(page).toHaveURL(/.*email/);

    const emailHeader = page.getByRole('heading', { level: 1, name: /Vibe Inbox/i });
    await expect(emailHeader).toBeVisible();
  });

  test('7. Verify Settings Modal', async ({ page }) => {
    const settingsButton = page.getByRole('button', { name: /Settings/i });
    await expect(settingsButton).toBeVisible();
    await settingsButton.click();

    // Find the settings dialog
    const dialog = page.getByRole('dialog', { name: /Settings/i });
    await expect(dialog).toBeVisible();

    // Close Modal
    const closeButton = dialog.getByRole('button', { name: /Close/i });
    await closeButton.click();
    await expect(dialog).toBeHidden();
  });
});
