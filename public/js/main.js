document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('#dashboard-summary')) { // Check if on the dashboard page
    fetchDashboardSummary();
  }
});

function fetchDashboardSummary() {
  fetch('/api/dashboard/summary')
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        updateDashboardSummary(data.data);
      } else {
        console.error('Failed to fetch dashboard summary:', data.message);
      }
    })
    .catch(error => {
      console.error('Error fetching dashboard summary:', error);
      console.trace();
    });
}

function updateDashboardSummary(summary) {
  document.getElementById('upcomingEventsCount').textContent = summary.upcomingEventsCountNext7Days;
  document.getElementById('totalIncome').textContent = summary.totalIncome.toFixed(2);
  document.getElementById('totalExpenses').textContent = summary.totalExpenses.toFixed(2);
}