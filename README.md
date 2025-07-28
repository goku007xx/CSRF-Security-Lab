# CSRF Security Lab

A hands-on demo lab to explore **Cross-Site Request Forgery (CSRF)** attacks and  techniques used to mitigate them. This project simulates a online banking application and demonstrates how attackers can exploit CSRF vulnerabilities and how developers can defend against them.

## Prerequisites

[Docker](https://docs.docker.com/engine/install) & [Docker Compose](https://docs.docker.com/compose/install) must be installed on your machine(Linux or Windows).

## Setting up the Lab

1. **Clone this repository and move to its directory.**
   ```bash
   git clone https://github.com/goku007xx/CSRF-Security-Lab.git && cd CSRF-Security-Lab
   ```

2. **Add the below content to your system's hosts file to map the required domains needed for the attacks and   mitigations.**
   ```txt
   127.0.0.1 insecure-bank.com
   127.0.0.1 synchronizer-bank.com
   127.0.0.1 double-submit-bank.com
   127.0.0.1 samesite-bank.com
   127.0.0.1 CatsThatHack.com
   ```
   **Linux** - `/etc/hosts`<br> 
   **Windows** - `C:\Windows\System32\drivers\etc\hosts`

3. **Start the Lab with Docker Compose.**
   ```bash
   docker compose up --build
   ```

4. **Check out the different scenarios in the below section and take your pick!**

5. **[OPTIONAL]: Run the below command to cleanly remove all the containers and images required for the lab once complete.**
   ```bash
   docker compose down --rmi all
   ```

## Scenarios covered

| Scenario    | Bank URL | Attacker Phishing URL |
| -------- | ------- | --------
| Vulnerable Bank (**No Mitigation**) | http://insecure-bank.com | http://CatsThatHack.com/index-insecure.html
| **Mitigation 1** - SameSite Cookie | http://samesite-bank.com | http://CatsThatHack.com/index-samesite.html
| **Mitigation 2** - Synchronizer Token | http://synchronizer-bank.com | http://CatsThatHack.com/index-synchronizer.html
| **Mitigation 3** - Double Submit | http://double-submit-bank.com | http://CatsThatHack.com/index-doublesubmit.html

Each scenario includes a **Bank URL** and a corresponding **Phishing Page URL**. The Bank URL is used to simulate a legitimate login and transaction flow, while the Phishing Page URL represents an attacker's malicious site attempting to exploit the bank's vulnerability through a CSRF attack.
   
To simulate a logged-in user, use the following credentials to log in to any of the bank application URLs:
- **Username**: `alice`  
- **Password**: `alice`

## Learn More / Help

For a deep dive into how each mitigation works and the reasoning behind them, check out the blogs: 

If you have any questions, please post them as comments on any of the blog posts.

## License

This project is licensed under the **MIT License**.