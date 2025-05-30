export async function createFamily(data: { Fcode: string; FamilyName: string }, token: string) {
  const response = await fetch('http://192.168.1.108:8000/api/family/create/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw { response: { data: errorData } };
  }
  return response.json();
}
