using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace ImageTranslateTest
{
    public partial class Form1 : Form
    {
      
        public Form1()
        {
            InitializeComponent();          
           // MessageBox.Show(LevenshteinDistance.Compute("Sam", "Samantha").ToString());
           // MessageBox.Show(LevenshteinDistance.Compute("flomax", "volmax").ToString());
        }


        private void button1_Click(object sender, EventArgs e)
        {
            acceptOCR();
        }

        public void acceptOCR()
        {
            string ocrText = ocrTextbox.Text;
            string correctText = originalTextbox.Text;
            double distance = Convert.ToInt32(LevenshteinDistance.Compute(correctText, ocrText));
            double length = correctText.Length;
            double accuracy = (length - distance) * 100  / length;
            MessageBox.Show("Levenshtein Distance:" + LevenshteinDistance.Compute(correctText, ocrText).ToString()
                + Environment.NewLine + "Accuracy: " + accuracy + "%");
        }
    }
}

static class LevenshteinDistance
{
    /// <summary>
    /// Compute the distance between two strings.
    /// </summary>
    public static int Compute(string s, string t)
    {
        int n = s.Length;
        int m = t.Length;
        int[,] d = new int[n + 1, m + 1];
        if (n == 0)
        {
            return m;
        }

        if (m == 0)
        {
            return n;
        }

        for (int i = 0; i <= n; d[i, 0] = i++)
        {
        }

        for (int j = 0; j <= m; d[0, j] = j++)
        {
        }

        for (int i = 1; i <= n; i++)
        {
            for (int j = 1; j <= m; j++)
            {
                int cost = (t[j - 1] == s[i - 1]) ? 0 : 1;
                d[i, j] = Math.Min(
                    Math.Min(d[i - 1, j] + 1, d[i, j - 1] + 1),
                    d[i - 1, j - 1] + cost);
            }
        }
        return d[n, m];
    }
}
