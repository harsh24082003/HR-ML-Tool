const API = "http://127.0.0.1:5000";

export async function fetchPrediction(emp) {
  try {
    const [salaryRes, attritionRes] = await Promise.all([
      fetch(`${API}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experience_years: Number(emp.experience_years || 0),
          total_tasks_completed: Number(emp.total_tasks_completed || emp.tasks_completed || 0),
          performance_rating: Number(emp.performance_rating || 0),
          projects_handled: Number(emp.projects_handled || 0),
          unpaid_leaves: Number(emp.unpaid_leaves || 0),
          late_login_count: Number(emp.late_login_count || 0),
        }),
      }),
      fetch(`${API}/predict-attrition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: Number(emp.age || 30),
          experience_years: Number(emp.experience_years || 0),
          total_tasks_completed: Number(emp.total_tasks_completed || emp.tasks_completed || 0),
          performance_rating: Number(emp.performance_rating || 0),
          unpaid_leaves: Number(emp.unpaid_leaves || 0),
          overtime_hours: Number(emp.overtime_hours || 0),
          late_login_count: Number(emp.late_login_count || 0),
          job_satisfaction: Number(emp.job_satisfaction || 3),
          work_life_balance: Number(emp.work_life_balance || 3),
          team_engagement_score: Number(emp.team_engagement_score || 75),
        }),
      }),
    ]);
    const [salaryData, attritionData] = await Promise.all([
      salaryRes.json(),
      attritionRes.json(),
    ]);
    return {
      mlSalary: salaryData.predicted_salary || 0,
      attritionRisk: attritionData.attrition_risk || 0,
      attritionFactors: attritionData.attrition_factors || null,
    };
  } catch {
    return { mlSalary: 0, attritionRisk: 0, attritionFactors: null };
  }
}
