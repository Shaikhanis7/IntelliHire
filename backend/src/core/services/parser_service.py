def extract_skills(text):
    skills = ["java", "python", "react", "ai"]
    return [s for s in skills if s in text.lower()]

def extract_name(text):
    return text.split("\n")[0][:30]